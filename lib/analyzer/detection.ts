// Deterministic structure detection: frameworks, package managers, entry
// points, important files, and dependencies. Nothing here uses AI — every
// result comes from file paths and the contents of well-known manifest files.

import type { Confidence, EntryPointInfo } from "@/lib/types";
import type { IngestedFile } from "@/lib/analyzer/ignore";

export interface DetectedDependency {
  name: string;
  version: string | null;
  type: string;
  scope: string | null;
}

export interface ImportantFile {
  path: string;
  kind: string;
}

const readLimit = 256 * 1024; // 256 KB cap on manifest reads

async function readText(path: string): Promise<string | null> {
  try {
    const { readFile } = await import("node:fs/promises");
    const buffer = await readFile(path);
    if (buffer.length > readLimit) return null;
    return buffer.toString("utf8");
  } catch {
    return null;
  }
}

function fileSet(files: IngestedFile[]): Map<string, IngestedFile> {
  return new Map(files.map((f) => [f.path, f]));
}

// --- Package managers ------------------------------------------------------

export function detectPackageManagers(files: IngestedFile[]): string[] {
  const names = fileSet(files);
  const managers: string[] = [];
  if (names.has("package-lock.json")) managers.push("npm");
  if (names.has("pnpm-lock.yaml")) managers.push("pnpm");
  if (names.has("yarn.lock")) managers.push("yarn");
  if (names.has("bun.lockb") || names.has("bun.lock")) managers.push("bun");
  if (names.has("Pipfile.lock") || names.has("Pipfile")) managers.push("pipenv");
  if (names.has("poetry.lock")) managers.push("poetry");
  if (names.has("requirements.txt")) managers.push("pip");
  if (names.has("pom.xml")) managers.push("Maven");
  if (names.has("build.gradle") || names.has("build.gradle.kts") || names.has("settings.gradle")) {
    managers.push("Gradle");
  }
  if (names.has("go.mod")) managers.push("Go modules");
  if (names.has("Cargo.toml")) managers.push("Cargo");
  return Array.from(new Set(managers));
}

// --- Frameworks ------------------------------------------------------------

export async function detectFrameworks(files: IngestedFile[]): Promise<string[]> {
  const names = fileSet(files);
  const frameworks = new Set<string>();

  const npmFile = names.get("package.json");
  if (npmFile) {
    const pkg = await readText(npmFile.absPath);
    if (pkg) {
      try {
        const parsed = JSON.parse(pkg) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        const all = { ...parsed.dependencies, ...parsed.devDependencies };
        const has = (key: string) => key in all;
        if (has("next")) frameworks.add("Next.js");
        if (has("react") || has("react-dom")) frameworks.add("React");
        if (has("express")) frameworks.add("Express");
        if (has("fastify")) frameworks.add("Fastify");
        if (has("@nestjs/core")) frameworks.add("NestJS");
        if (has("vue")) frameworks.add("Vue.js");
        if (has("nuxt") || has("@nuxt/kit")) frameworks.add("Nuxt.js");
        if (has("svelte")) frameworks.add("Svelte");
        if (has("@sveltejs/kit")) frameworks.add("SvelteKit");
        if (has("astro")) frameworks.add("Astro");
        if (has("@angular/core")) frameworks.add("Angular");
        if (has("remix") || has("@remix-run/react")) frameworks.add("Remix");
        if (has("gatsby")) frameworks.add("Gatsby");
        if (has("electron")) frameworks.add("Electron");
        if (has("flask")) frameworks.add("Flask");
        if (has("@testing-library/react")) frameworks.add("React Testing Library");
      } catch {
        // Malformed package.json: no framework detection from it.
      }
    }
  }

  const requirements = names.get("requirements.txt");
  if (requirements) {
    const content = await readText(requirements.absPath);
    if (content) {
      const lower = content.toLowerCase();
      if (lower.includes("django")) frameworks.add("Django");
      if (lower.includes("flask")) frameworks.add("Flask");
      if (lower.includes("fastapi")) frameworks.add("FastAPI");
      if (lower.includes("starlette")) frameworks.add("Starlette");
    }
  }

  const pyproject = names.get("pyproject.toml");
  if (pyproject) {
    const content = await readText(pyproject.absPath);
    if (content) {
      const lower = content.toLowerCase();
      if (lower.includes("django")) frameworks.add("Django");
      if (lower.includes("flask")) frameworks.add("Flask");
      if (lower.includes("fastapi")) frameworks.add("FastAPI");
    }
  }

  const pom = names.get("pom.xml");
  if (pom) {
    const content = await readText(pom.absPath);
    if (content && content.includes("spring-boot")) frameworks.add("Spring Boot");
  }

  const gradle = names.get("build.gradle") ?? names.get("build.gradle.kts");
  if (gradle) {
    const content = await readText(gradle.absPath);
    if (content && (content.includes("spring-boot") || content.includes("org.springframework.boot"))) {
      frameworks.add("Spring Boot");
    }
  }

  return Array.from(frameworks);
}

// --- Important files -------------------------------------------------------

export function detectImportantFiles(files: IngestedFile[]): ImportantFile[] {
  const byPath = fileSet(files);
  const important: ImportantFile[] = [];

  const add = (path: string, kind: string) => {
    if (byPath.has(path)) important.push({ path, kind });
  };

  for (const file of files) {
    const p = file.path;
    const name = file.name.toLowerCase();

    if (/^readme/i.test(name)) add(p, "Documentation");
    if (name === "package.json") add(p, "Package manifest");
    if (name === "tsconfig.json" || /^tsconfig\..+\.json$/.test(name)) add(p, "TypeScript config");
    if (/^next\.config\./.test(name)) add(p, "Framework config");
    if (/^vite\.config\./.test(name)) add(p, "Build config");
    if (/^webpack\.config\./.test(name)) add(p, "Build config");
    if (/^tailwind\.config\./.test(name)) add(p, "Styling config");
    if (/^eslint\.config\./.test(name) || /^\.eslintrc/.test(name)) add(p, "Linting config");
    if (/^prettier\./.test(name) || name === ".prettierrc") add(p, "Formatting config");
    if (name === "dockerfile" || /^dockerfile(\..+)?$/.test(name)) add(p, "Container config");
    if (/^docker-compose/.test(name)) add(p, "Container config");
    if (/^\.github\/workflows\//.test(p)) add(p, "CI/CD");
    if (name === ".gitlab-ci.yml") add(p, "CI/CD");
    if (name === "jenkinsfile") add(p, "CI/CD");
    if (/^\.circleci\/config\./.test(p)) add(p, "CI/CD");
    if (name === ".travis.yml") add(p, "CI/CD");
    if (name === "azure-pipelines.yml") add(p, "CI/CD");
    if (name === "requirements.txt") add(p, "Dependencies");
    if (name === "pyproject.toml") add(p, "Dependencies");
    if (name === "pipfile") add(p, "Dependencies");
    if (name === "poetry.lock") add(p, "Dependencies");
    if (name === "pom.xml") add(p, "Build config");
    if (name === "build.gradle" || name === "build.gradle.kts" || name === "settings.gradle") {
      add(p, "Build config");
    }
    if (name === "go.mod") add(p, "Dependencies");
    if (name === "cargo.toml") add(p, "Dependencies");
    if (file.extension === "sql") add(p, "Database schema");
    if (name === "schema.prisma") add(p, "Database schema");
    if (/^drizzle\.config\./.test(name)) add(p, "Database config");
    if (/\/(migrations|alembic)\//.test(p)) add(p, "Database migration");
    if (name === ".env.example") add(p, "Environment config");
    if (/^settings\.(py|json)$/.test(name)) add(p, "Configuration");
    if (name === "application.yml" || name === "application.yaml" || name === "application.properties") {
      add(p, "Configuration");
    }
    if (/^config\./.test(name) || /\.config\./.test(name)) add(p, "Configuration");
    if (/\/route\.(ts|js|tsx|jsx)$/.test(p) || /\/page\.(tsx|jsx)$/.test(p)) {
      add(p, "API route");
    }
    if (/\/pages\/api\//.test(p)) add(p, "API route");
    if (/\/(routes|controllers|api)\//.test(p)) add(p, "API route");
    if (name === "urls.py") add(p, "API route");
  }

  // Deduplicate by path (first kind wins).
  const seen = new Set<string>();
  return important.filter((item) => {
    if (seen.has(item.path)) return false;
    seen.add(item.path);
    return true;
  });
}

// --- Entry points ----------------------------------------------------------

const CODE_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs", "py", "java", "kt", "kts", "go", "rs",
  "rb", "php", "cs", "swift", "scala", "dart",
]);

export async function detectEntryPoints(
  files: IngestedFile[],
  byPath: Map<string, IngestedFile>
): Promise<EntryPointInfo[]> {
  const entryPoints: EntryPointInfo[] = [];

  const add = (path: string, confidence: Confidence, note?: string) => {
    if (!byPath.has(path)) return;
    if (entryPoints.some((e) => e.path === path)) return;
    entryPoints.push({ path, confidence, note });
  };

  // package.json bin field is an explicit, authoritative entry point.
  const pkgFile = byPath.get("package.json");
  if (pkgFile) {
    const content = await readText(pkgFile.absPath);
    if (content) {
      try {
        const parsed = JSON.parse(content) as { bin?: string | Record<string, string> };
        if (parsed.bin) {
          if (typeof parsed.bin === "string") {
            add(parsed.bin, "HIGH", "Declared in package.json bin");
          } else {
            for (const binPath of Object.values(parsed.bin)) {
              add(binPath, "HIGH", "Declared in package.json bin");
            }
          }
        }
      } catch {
        // Ignore malformed manifests.
      }
    }
  }

  for (const file of files) {
    if (!CODE_EXTENSIONS.has(file.extension)) continue;
    const name = file.name;
    const dir = file.directory;
    const depth = dir === "" ? 0 : dir.split("/").length;

    // --- Python ---
    if (file.extension === "py") {
      if (name === "manage.py") {
        add(file.path, "HIGH", "Django management entry point");
        continue;
      }
      if (name === "wsgi.py") {
        add(file.path, "MEDIUM", "WSGI application");
        continue;
      }
      if (name === "asgi.py") {
        add(file.path, "MEDIUM", "ASGI application");
        continue;
      }
    }

    // --- Java / Spring Boot ---
    if (file.extension === "java") {
      if (/Application\.java$/.test(name) && /\bsrc\/main\/java\b/.test(dir)) {
        add(file.path, "HIGH", "Spring Boot main class");
        continue;
      }
    }

    // --- Go ---
    if (file.extension === "go" && name === "main.go") {
      if (dir === "" || /^cmd(\/|$)/.test(dir)) {
        add(file.path, "HIGH", "Go main package");
      } else {
        add(file.path, "LOW", "Go file in a subpackage");
      }
      continue;
    }

    // --- Next.js app router ---
    if ((file.name === "page.tsx" || file.name === "page.jsx" || file.name === "layout.tsx") &&
        (/^app\//.test(dir) || /^src\/app\//.test(dir))) {
      add(file.path, "HIGH", "Next.js app route");
      continue;
    }

    // --- Generic main / index / server / app by depth ---
    const base = name.replace(/\.(ts|tsx|js|jsx|mjs|cjs|py|java|go|rs|rb|php|kt|cs|swift)$/i, "");
    const isMain = base === "main";
    const isIndex = base === "index";
    const isServer = base === "server";
    const isApp = base === "app";

    if (dir === "") {
      if (isMain || isServer || isApp) {
        const confidence: Confidence = isServer || isApp ? "MEDIUM" : "HIGH";
        add(file.path, confidence, isMain ? "Root main module" : "Root application module");
        continue;
      }
      if (isIndex) {
        add(file.path, "MEDIUM", "Root index module");
        continue;
      }
    } else if (dir === "src") {
      if (isMain || isServer || isApp || isIndex) {
        add(file.path, "MEDIUM", "Entry module in src/");
        continue;
      }
    } else {
      if ((isMain || isIndex || isServer || isApp) && depth <= 2) {
        add(file.path, "LOW", "Named module deeper in the tree");
        continue;
      }
    }
  }

  // Content hints: confirm/deny server entry points.
  for (const entry of entryPoints) {
    const file = byPath.get(entry.path);
    if (!file) continue;
    if (file.extension !== "js" && file.extension !== "ts" && file.extension !== "mjs" && file.extension !== "cjs") {
      continue;
    }
    const content = await readText(file.absPath);
    if (!content) continue;
    if (/\.listen\(\s*/.test(content)) {
      entry.confidence = "HIGH";
      entry.note = entry.note ? `${entry.note} (starts a server)` : "Starts a server";
    }
  }

  return entryPoints.sort((a, b) => {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return order[a.confidence] - order[b.confidence];
  });
}

// --- Dependencies ----------------------------------------------------------

function parseRequirements(content: string): DetectedDependency[] {
  const deps: DetectedDependency[] = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("-") || line.startsWith("--") || line.startsWith("-r")) {
      continue;
    }
    // Skip editable installs and URLs.
    if (line.startsWith("-e ") || /^(https?|git\+)/.test(line)) continue;
    const match = line.match(/^([A-Za-z0-9._-]+)\s*(?:==|>=|<=|~=|!=|===)\s*(.+)$/);
    if (match) {
      deps.push({ name: match[1], version: match[2].trim(), type: "pip", scope: "runtime" });
    } else if (/^[A-Za-z0-9._-]+$/.test(line)) {
      deps.push({ name: line, version: null, type: "pip", scope: "runtime" });
    }
  }
  return deps;
}

function parsePyproject(content: string): DetectedDependency[] {
  const deps: DetectedDependency[] = [];
  let inDepsSection = false;
  let inProjectTable = false;
  let currentScope = "runtime";
  let inArray = false;

  const addPair = (line: string, scope: string) => {
    // TOML dependency: name = "version" or name = { version = "..." }
    const eq = line.match(/^"?([A-Za-z0-9._-]+)"?\s*=\s*(.+)$/);
    if (!eq) return;
    const name = eq[1];
    let version: string | null = null;
    const value = eq[2];
    const inline = value.match(/^\s*"?([^"{}]+)"?\s*$/);
    if (inline) version = inline[1];
    else {
      const nested = value.match(/version\s*=\s*"?([^"{}]+)"?/);
      if (nested) version = nested[1];
    }
    deps.push({ name, version, type: "poetry", scope });
  };

  const addArrayItem = (line: string, scope: string) => {
    // PEP 621 array item: "name>=1.0" — capture everything between quotes so
    // version constraints containing commas (e.g. "idna>=2.5,<4") survive.
    const item = line.match(/^\s*"([^"]+)"\s*,?\s*$/);
    if (!item) return;
    const spec = item[1].trim();
    if (!spec) return;
    const match = spec.match(/^([A-Za-z0-9._-]+)(.*)$/);
    if (!match) return;
    const version = match[2].trim();
    deps.push({ name: match[1], version: version || null, type: "poetry", scope });
  };

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line.startsWith("[")) {
      const section = line.toLowerCase();
      inProjectTable = section === "[project]";
      inDepsSection =
        inProjectTable ||
        section.includes("project.dependencies") ||
        section.includes("tool.poetry.dependencies") ||
        section.includes("tool.poetry.group");
      currentScope = section.includes("group") || section.includes("dev") ? "dev" : "runtime";
      inArray = false;
      continue;
    }

    if (!inDepsSection) continue;

    if (inArray) {
      if (line.includes("]")) {
        inArray = false;
        if (line.includes('"')) addArrayItem(line.replace("]", ""), currentScope);
      } else if (line.includes('"')) {
        addArrayItem(line, currentScope);
      }
      continue;
    }

    if (/^(optional-)?dependencies\s*=\s*\[/.test(line)) {
      const inlineRest = line.replace(/^(optional-)?dependencies\s*=\s*\[/, "");
      const rest = inlineRest.replace(/\]\s*$/, "");
      if (rest.includes('"')) addArrayItem(rest, currentScope);
      if (!inlineRest.includes("]")) inArray = true;
      continue;
    }

    // Inside the metadata [project] table, only the dependencies array counts.
    if (inProjectTable) continue;
    addPair(line, currentScope);
  }
  return deps;
}

function parsePom(content: string): DetectedDependency[] {
  const deps: DetectedDependency[] = [];
  const blocks = content.match(/<dependency>[\s\S]*?<\/dependency>/g) ?? [];
  for (const block of blocks) {
    const group = block.match(/<groupId>([^<]+)<\/groupId>/)?.[1];
    const artifact = block.match(/<artifactId>([^<]+)<\/artifactId>/)?.[1];
    const version = block.match(/<version>([^<]+)<\/version>/)?.[1];
    const scope = block.match(/<scope>([^<]+)<\/scope>/)?.[1];
    if (artifact) {
      deps.push({
        name: group ? `${group}:${artifact}` : artifact,
        version: version ?? null,
        type: "maven",
        scope: scope ?? "runtime",
      });
    }
  }
  return deps;
}

function parseGradle(content: string): DetectedDependency[] {
  const deps: DetectedDependency[] = [];
  const patterns = [
    /(?:implementation|api|compileOnly|runtimeOnly|testImplementation)\s+['"]([^'"]+)['"]/g,
    /(?:implementation|api|compileOnly|runtimeOnly|testImplementation)\("([^"]+)"\)/g,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const coords = match[1].trim();
      // group:artifact:version or artifact:version
      const parts = coords.split(":");
      if (parts.length >= 2) {
        const name = parts.length === 3 ? `${parts[0]}:${parts[1]}` : parts[0];
        const version = parts.length === 3 ? parts[2] : null;
        deps.push({ name, version, type: "gradle", scope: "runtime" });
      }
    }
  }
  return deps;
}

function parseGoMod(content: string): DetectedDependency[] {
  const deps: DetectedDependency[] = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = line.match(/^([^\s]+)\s+v([^\s]+)$/);
    if (match) {
      deps.push({ name: match[1], version: match[2], type: "go", scope: "runtime" });
    }
  }
  return deps;
}

function parseCargo(content: string): DetectedDependency[] {
  const deps: DetectedDependency[] = [];
  let inSection = false;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith("[") && line.endsWith("]")) {
      const section = line.toLowerCase();
      inSection = section.includes("dependencies");
      continue;
    }
    if (!inSection) continue;
    const match = line.match(/^([A-Za-z0-9_-]+)\s*=\s*"?([^"{}]+)"?\s*$/);
    if (match) {
      deps.push({ name: match[1], version: match[2].trim(), type: "cargo", scope: "runtime" });
    }
  }
  return deps;
}

export async function detectDependencies(
  files: IngestedFile[],
  byPath: Map<string, IngestedFile>
): Promise<DetectedDependency[]> {
  const deps: DetectedDependency[] = [];

  const pkg = byPath.get("package.json");
  if (pkg) {
    const content = await readText(pkg.absPath);
    if (content) {
      try {
        const parsed = JSON.parse(content) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
          optionalDependencies?: Record<string, string>;
        };
        for (const [name, version] of Object.entries(parsed.dependencies ?? {})) {
          deps.push({ name, version, type: "npm", scope: "runtime" });
        }
        for (const [name, version] of Object.entries(parsed.devDependencies ?? {})) {
          deps.push({ name, version, type: "npm", scope: "dev" });
        }
      } catch {
        // Malformed package.json.
      }
    }
  }

  const requirements = byPath.get("requirements.txt");
  if (requirements) {
    const content = await readText(requirements.absPath);
    if (content) deps.push(...parseRequirements(content));
  }

  const pyproject = byPath.get("pyproject.toml");
  if (pyproject) {
    const content = await readText(pyproject.absPath);
    if (content) deps.push(...parsePyproject(content));
  }

  const pom = byPath.get("pom.xml");
  if (pom) {
    const content = await readText(pom.absPath);
    if (content) deps.push(...parsePom(content));
  }

  const gradle = byPath.get("build.gradle") ?? byPath.get("build.gradle.kts");
  if (gradle) {
    const content = await readText(gradle.absPath);
    if (content) deps.push(...parseGradle(content));
  }

  const goMod = byPath.get("go.mod");
  if (goMod) {
    const content = await readText(goMod.absPath);
    if (content) deps.push(...parseGoMod(content));
  }

  const cargo = byPath.get("Cargo.toml");
  if (cargo) {
    const content = await readText(cargo.absPath);
    if (content) deps.push(...parseCargo(content));
  }

  // Deduplicate.
  const seen = new Set<string>();
  return deps.filter((d) => {
    const key = `${d.type}|${d.scope}|${d.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}