// Import extraction — turns raw source files into two kinds of evidence:
// which local files a file depends on, and which external packages it uses.
// Regex-based by design: fast, dependency-free, and good enough to map
// component-level relationships (we never need a perfect AST).

export interface FileImports {
  /** Repo-relative paths of local files this file imports. */
  localFiles: string[];
  /** Bare package specifiers this file imports (e.g. "stripe", "@prisma/client"). */
  packages: string[];
}

const JS_TS_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte"];
const CODE_EXTENSIONS = new Set([
  ...JS_TS_EXTENSIONS,
  ".py",
  ".go",
  ".java",
  ".kt",
  ".rb",
  ".php",
]);

export function isImportableFile(path: string): boolean {
  const dot = path.lastIndexOf(".");
  if (dot === -1) return false;
  return CODE_EXTENSIONS.has(path.slice(dot).toLowerCase());
}

function stripQueryString(specifier: string): string {
  // Vite/webpack-style queries and fragments: "./x.vue?vue&type=style"
  const q = specifier.search(/[?#]/);
  return q === -1 ? specifier : specifier.slice(0, q);
}

/** Extract import/export/require/dynamic-import specifiers from TS/JS/Vue/Svelte source. */
function extractJsSpecifiers(content: string): string[] {
  const specifiers: string[] = [];
  const patterns = [
    /import\s+[^'"]*?from\s*['"]([^'"]+)['"]/g,
    /import\s*['"]([^'"]+)['"]/g,
    /export\s+[^'"]*?from\s*['"]([^'"]+)['"]/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      specifiers.push(match[1]);
    }
  }
  return specifiers;
}

/** Resolve a relative JS/TS specifier against the set of real file paths. */
function resolveRelative(specifier: string, importerPath: string, paths: Set<string>): string | null {
  const cleaned = stripQueryString(specifier);
  const isRelative = cleaned.startsWith("./") || cleaned.startsWith("../") || cleaned === "." || cleaned === "..";
  const isRootAlias = cleaned.startsWith("~/") || cleaned.startsWith("@/");
  const isAbsoluteSlash = /^\/(?!\/)/.test(cleaned);
  if (!isRelative && !isRootAlias && !isAbsoluteSlash) return null;

  let baseParts: string[];
  if (isRootAlias || isAbsoluteSlash) {
    // Webpack/tsconfig-style root aliases resolve from the repository root.
    baseParts = [];
  } else {
    const dir = importerPath.includes("/") ? importerPath.slice(0, importerPath.lastIndexOf("/")) : "";
    baseParts = dir ? dir.split("/") : [];
  }
  for (const part of cleaned.split("/")) {
    if (part === "." || part === "" || part === "~" || part === "@") continue;
    if (part === "..") baseParts.pop();
    else baseParts.push(part);
  }
  const target = baseParts.join("/");
  if (!target) return null;

  const candidates = [target];
  for (const ext of JS_TS_EXTENSIONS) candidates.push(target + ext);
  for (const ext of [".ts", ".tsx", ".js", ".jsx"]) candidates.push(`${target}/index${ext}`);

  for (const candidate of candidates) {
    if (paths.has(candidate)) return candidate;
  }
  return null;
}

/** Extract Python imports (`import x.y`, `from .x import y`). */
function extractPython(content: string): { modules: string[]; relatives: string[] } {
  const modules: string[] = [];
  const relatives: string[] = [];
  const patterns = [
    /^\s*from\s+(\.+[\w.]*)\s+import\s+/gm,
    /^\s*from\s+([\w.]+)\s+import\s+/gm,
    /^\s*import\s+([\w.]+(?:\s*,\s*[\w.]+)*)/gm,
  ];
  for (const [index, pattern] of patterns.entries()) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const raw = match[1];
      if (index === 0) {
        relatives.push(raw);
      } else {
        for (const part of raw.split(/\s*,\s*/)) modules.push(part);
      }
    }
  }
  return { modules, relatives };
}

/** Extract Go imports (single-line and block form), plus the module name from go.mod content when given. */
function extractGo(content: string): string[] {
  const imports: string[] = [];
  const single = /^\s*import\s+(?:_|\w\s+)?["']([^"']+)["']/gm;
  let match: RegExpExecArray | null;
  while ((match = single.exec(content)) !== null) imports.push(match[1]);
  const block = /import\s*\(([^)]*)\)/g;
  while ((match = block.exec(content)) !== null) {
    const inner = match[1];
    const lineRe = /["']([^"']+)["']/g;
    let lineMatch: RegExpExecArray | null;
    while ((lineMatch = lineRe.exec(inner)) !== null) imports.push(lineMatch[1]);
  }
  return imports;
}

/** Extract Java/Kotlin package imports. */
function extractJava(content: string): string[] {
  const imports: string[] = [];
  const pattern = /^\s*import\s+(?:static\s+)?([\w.]+)\s*;/gm;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) imports.push(match[1]);
  return imports;
}

/**
 * Compute what one file imports, resolved against the repository's real file
 * paths. Only imports that resolve to actual repo files count as local-file
 * evidence; bare specifiers count as external-package evidence.
 */
export function extractFileImports(
  path: string,
  content: string,
  allPaths: Set<string>,
  goModulePrefix?: string
): FileImports {
  const result: FileImports = { localFiles: [], packages: [] };
  const dot = path.lastIndexOf(".");
  const ext = dot === -1 ? "" : path.slice(dot).toLowerCase();

  const addLocal = (target: string | null) => {
    if (target && target !== path && !result.localFiles.includes(target)) {
      result.localFiles.push(target);
    }
  };
  const addPackage = (specifier: string) => {
    if (!result.packages.includes(specifier)) result.packages.push(specifier);
  };

  if (ext === ".py") {
    const { modules, relatives } = extractPython(content);
    const importerDir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";

    for (const rel of relatives) {
      // Count leading dots: each one steps up one directory.
      const dots = rel.match(/^\.+/)?.[0].length ?? 0;
      const rest = rel.slice(dots).replace(/\./g, "/");
      const parts = importerDir.split("/").filter(Boolean);
      for (let i = 1; i < dots; i++) parts.pop();
      if (rest) parts.push(rest);

      const stem = parts.join("/");
      for (const candidate of [`${stem}.py`, `${stem}/__init__.py`]) {
        if (allPaths.has(candidate)) addLocal(candidate);
      }
    }

    for (const mod of modules) {
      const stem = mod.replace(/\./g, "/");
      for (const candidate of [`${stem}.py`, `${stem}/__init__.py`]) {
        if (allPaths.has(candidate)) addLocal(candidate);
      }
      addPackage(mod.split(".")[0]);
    }
    return result;
  }

  if (ext === ".go") {
    for (const imp of extractGo(content)) {
      if (goModulePrefix && (imp === goModulePrefix || imp.startsWith(goModulePrefix + "/"))) {
        addLocal(imp.slice(goModulePrefix.length + 1) + ".go");
        continue;
      }
      addPackage(imp);
    }
    return result;
  }

  if (ext === ".java" || ext === ".kt") {
    for (const imp of extractJava(content)) {
      const candidate = `src/main/java/${imp.replace(/\./g, "/")}.${ext}`;
      if (allPaths.has(candidate)) addLocal(candidate);
      else addPackage(imp.split(".")[0]);
    }
    return result;
  }

  if (JS_TS_EXTENSIONS.includes(ext)) {
    for (const specifier of extractJsSpecifiers(content)) {
      const cleaned = stripQueryString(specifier);
      if (!cleaned) continue;
      if (cleaned.startsWith(".") || cleaned.startsWith("/") || cleaned.startsWith("~/") || cleaned.startsWith("@/")) {
        addLocal(resolveRelative(cleaned, path, allPaths));
      } else if (cleaned.startsWith("@")) {
        // Scoped package: keep the first two segments ("@scope/pkg").
        addPackage(cleaned.split("/").slice(0, 2).join("/"));
      } else {
        addPackage(cleaned.split("/")[0]);
      }
    }
    return result;
  }

  return result;
}
