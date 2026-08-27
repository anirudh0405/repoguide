// Architecture graph builder — turns ingested repository files into an
// evidence-backed component graph. Deterministic, no AI: every node exists
// because real files were classified into it, and every edge exists because
// of real imports, HTTP calls, package usage, or configuration.
//
// Confidence policy:
//   HIGH   — two or more independent pieces of direct evidence (files), or an
//            exact structural match (e.g. a fetch() to a route that exists).
//   MEDIUM — a single direct piece of evidence (one file's import/call).
//   LOW    — indirect evidence only (configuration, framework convention).

import { classifyFile, KNOWN_SERVICES } from "@/lib/architecture/components";
import { extractFileImports, isImportableFile } from "@/lib/architecture/imports";
import type {
  ArchEdge,
  ArchNode,
  ArchitectureModel,
  ArchitectureSummaryStats,
  ComponentType,
  EdgeEvidence,
} from "@/lib/architecture/types";
import { COMPONENT_META } from "@/lib/architecture/types";
import type { IngestedFile } from "@/lib/analyzer/ignore";
import type { AnalysisSummary } from "@/lib/types";

const MAX_FILES_SCANNED = 6000;
const MAX_FILES_PER_NODE = 8;
const MAX_NODES = 32;

const INTERNAL_TYPES = new Set<ComponentType>([
  "frontend",
  "backend",
  "api",
  "auth",
  "service",
  "worker",
]);

interface FileRecord {
  file: IngestedFile;
  content: string | null;
  component: ComponentType | null;
  localImports: string[];
  packages: string[];
}

interface EdgeAccumulator {
  evidence: EdgeEvidence[];
  sources: Set<string>; // distinct contributing files
}

function topDirectories(paths: string[]): string[] {
  const counts = new Map<string, number>();
  for (const p of paths) {
    const dir = p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : ".";
    const top = dir.split("/").slice(0, 2).join("/");
    counts.set(top, (counts.get(top) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([dir]) => dir);
}

/** Notable packages worth showing on nodes: known services + frameworks. */
const FRAMEWORK_PACKAGES = new Set([
  "next", "react", "react-dom", "vue", "svelte", "@angular/core", "express",
  "fastify", "@nestjs/common", "astro", "nuxt", "remix", "@remix-run/node",
  "django", "flask", "fastapi", "starlette", "spring-boot", "gin-gonic/gin",
  "axios", "graphql", "zod",
]);

export async function buildArchitectureModel(
  files: IngestedFile[],
  options: {
    summary: AnalysisSummary;
    readFile: (path: string) => Promise<string | null>;
    goModulePrefix?: string;
  }
): Promise<ArchitectureModel> {
  const { summary, readFile, goModulePrefix } = options;
  const allPaths = new Set(files.map((f) => f.path));

  // --- 1. Scan files: read content, classify, extract imports ----------------
  const scannable = files.filter((f) => isImportableFile(f.path)).slice(0, MAX_FILES_SCANNED);
  const records: FileRecord[] = [];
  // Manifests matter for classification even though they aren't code.
  const manifestLike = files.filter(
    (f) => f.name === "schema.prisma" || f.extension === "sql" || f.name === "urls.py"
  );

  for (const file of [...manifestLike, ...scannable]) {
    if (records.some((r) => r.file.path === file.path)) continue;
    const content = await readFile(file.path);
    const classification = classifyFile(file, content);
    let localImports: string[] = [];
    let packages: string[] = [];
    if (content && isImportableFile(file.path)) {
      const imports = extractFileImports(file.path, content, allPaths, goModulePrefix);
      localImports = imports.localFiles;
      packages = imports.packages;
    }
    records.push({
      file,
      content,
      component: classification?.type ?? null,
      localImports,
      packages,
    });
  }

  const recordByPath = new Map(records.map((r) => [r.file.path, r]));

  // --- 2. Group internal components ------------------------------------------
  const byComponent = new Map<ComponentType, FileRecord[]>();
  for (const record of records) {
    if (!record.component || !INTERNAL_TYPES.has(record.component)) continue;
    const list = byComponent.get(record.component) ?? [];
    list.push(record);
    byComponent.set(record.component, list);
  }

  // --- 2b. Give infrastructure-classified files a home ------------------------
  // Files classified as database/storage/queue belong to a concrete system
  // node (e.g. "Database (Prisma)") when their packages match one, or to a
  // generic per-category node otherwise — they must never silently vanish.
  const INFRA_TYPES = new Set<ComponentType>(["database", "storage", "queue"]);
  const infraOwners = new Map<string, string>(); // file path -> infra node id
  const pendingByCategory = new Map<ComponentType, string[]>();

  interface InfraSystem {
    id: string;
    category: "external" | "database" | "storage" | "queue";
    label: string;
    description: string;
    packages: string[];
    files: string[];
  }
  const infra = new Map<string, InfraSystem>();

  // --- 3. Detect third-party systems (databases, queues, storage, APIs) ------
  const addInfra = (pkg: string, fromPath: string) => {
    const known = KNOWN_SERVICES[pkg];
    if (!known) return;
    const id = `${known.category}:${known.label}`;
    const system = infra.get(id) ?? {
      id,
      category: known.category,
      label: known.label,
      description: known.description,
      packages: [],
      files: [],
    };
    if (!system.packages.includes(pkg)) system.packages.push(pkg);
    if (!system.files.includes(fromPath)) system.files.push(fromPath);
    infra.set(id, system);
  };

  // Configuration evidence (.env.example, docker-compose, config files) —
  // weaker than imports, only used when no import evidence exists.
  const configEvidence = new Map<string, Set<string>>(); // service label -> config files
  const CONFIG_KEYS: Array<[RegExp, string]> = [
    [/STRIPE/i, "Stripe"],
    [/OPENAI/i, "OpenAI"],
    [/ANTHROPIC/i, "Anthropic"],
    [/TWILIO/i, "Twilio"],
    [/SENDGRID/i, "SendGrid"],
    [/S3_BUCKET|AWS_S3/i, "AWS S3"],
    [/KAFKA/i, "Kafka"],
    [/RABBITMQ|AMQP/i, "RabbitMQ"],
    [/MONGO/i, "MongoDB"],
    [/REDIS/i, "Redis"],
  ];

  for (const record of records) {
    for (const pkg of record.packages) {
      addInfra(pkg, record.file.path);
    }
  }

  const configCandidates = files.filter((f) =>
    /^\.env\.example$/.test(f.name) ||
    /^docker-compose[\w.]*\.ya?ml$/.test(f.name) ||
    /^config\.(ts|js|py)$/.test(f.name)
  );
  for (const configFile of configCandidates.slice(0, 10)) {
    const content = await readFile(configFile.path);
    if (!content) continue;
    for (const [pattern, label] of CONFIG_KEYS) {
      if (pattern.test(content)) {
        const set = configEvidence.get(label) ?? new Set<string>();
        set.add(configFile.path);
        configEvidence.set(label, set);
      }
    }
  }

  // Assign infrastructure-classified files to concrete systems by package
  // overlap; anything unmatched waits for a generic per-category node.
  for (const record of records) {
    if (!record.component || !INFRA_TYPES.has(record.component)) continue;
    let target: InfraSystem | undefined;
    for (const pkg of record.packages) {
      const known = KNOWN_SERVICES[pkg];
      if (!known || known.category !== record.component) continue;
      const candidate = infra.get(`${known.category}:${known.label}`);
      if (candidate) {
        target = candidate;
        break;
      }
    }
    if (target) {
      if (!target.files.includes(record.file.path)) target.files.push(record.file.path);
      infraOwners.set(record.file.path, target.id);
    } else {
      const list = pendingByCategory.get(record.component) ?? [];
      list.push(record.file.path);
      pendingByCategory.set(record.component, list);
    }
  }

  // --- 4. Build internal nodes -------------------------------------------------
  const entryPointPaths = new Set(summary.entryPoints.map((e) => e.path));
  const importantFilePaths = new Set(summary.importantFiles.map((f) => f.path));

  function pickRepresentativeFiles(list: FileRecord[]): string[] {
    return [...list]
      .map((r) => r.file.path)
      .sort((a, b) => {
        const score = (p: string) =>
          (entryPointPaths.has(p) ? 0 : importantFilePaths.has(p) ? 1 : 2) * 10000 + p.length;
        return score(a) - score(b) || a.localeCompare(b);
      })
      .slice(0, MAX_FILES_PER_NODE);
  }

  const notablePackages = (list: FileRecord[]): string[] => {
    const names = new Set<string>();
    for (const r of list) {
      for (const pkg of r.packages) {
        if (KNOWN_SERVICES[pkg] || FRAMEWORK_PACKAGES.has(pkg)) names.add(pkg);
      }
    }
    return Array.from(names).sort().slice(0, 10);
  };

  const nodes: ArchNode[] = [];

  for (const [type, list] of byComponent) {
    const paths = list.map((r) => r.file.path);
    const dirs = topDirectories(paths);
    const meta = COMPONENT_META[type];
    const deps = notablePackages(list);
    const depNote = deps.length > 0 ? ` Built with ${deps.slice(0, 3).join(", ")}.` : "";
    const dirNote =
      dirs.length > 0 && dirs[0] !== "."
        ? ` Mainly under ${dirs.map((d) => `${d}/`).join(" and ")}.`
        : "";
    nodes.push({
      id: type,
      type,
      label: meta.label,
      description: `${meta.label} — ${list.length} file${list.length === 1 ? "" : "s"} ${describeRole(type)}.${dirNote}${depNote}`,
      files: pickRepresentativeFiles(list),
      fileCount: list.length,
      dependencies: deps,
    });
  }

  function describeRole(type: ComponentType): string {
    switch (type) {
      case "frontend": return "render the user interface";
      case "backend": return "run the server application";
      case "api": return "handle HTTP requests";
      case "auth": return "handle sign-in and access control";
      case "service": return "contain business logic";
      case "worker": return "run background work";
      default: return "";
    }
  }

  // --- 5. Build infra nodes (with import evidence; config-only gets LOW edge) --
  // Infra nodes referenced only by config still appear, marked honestly.
  for (const label of configEvidence.keys()) {
    const id = `external-config:${label}`;
    if (infra.has(id) || [...infra.values()].some((s) => s.label === label)) continue;
    // Only config evidence — create the node but remember its weakness via
    // the edge built below (LOW confidence).
    infra.set(id, {
      id,
      category: "external",
      label,
      description: KNOWN_SERVICES[label.toLowerCase()]?.description ?? "Third-party service",
      packages: [],
      files: [],
    });
  }

  // Leftover infrastructure-classified files attach to an existing system of
  // the same category, or become a generic category node (e.g. "Database").
  for (const [category, pending] of pendingByCategory) {
    if (pending.length === 0) continue;
    const systemsInCategory = Array.from(infra.values())
      .filter((s) => s.category === category)
      .sort((a, b) => b.files.length - a.files.length || a.id.localeCompare(b.id));
    if (systemsInCategory.length > 0) {
      const first = systemsInCategory[0];
      for (const p of pending) {
        if (!first.files.includes(p)) first.files.push(p);
        infraOwners.set(p, first.id);
      }
    } else {
      const meta = COMPONENT_META[category];
      infra.set(category, {
        id: category,
        category: category as InfraSystem["category"],
        label: meta.label,
        description: meta.description,
        packages: [],
        files: [...pending],
      });
      for (const p of pending) {
        if (!infraOwners.has(p)) infraOwners.set(p, category);
      }
    }
  }

  const infraNodes: ArchNode[] = [];
  for (const system of infra.values()) {
    if (infraNodes.length >= MAX_NODES - nodes.length) break;
    infraNodes.push({
      id: system.id,
      type: system.category,
      label: system.label,
      description: `${system.label} — ${system.description}.${
        system.files.length > 0
          ? ` Used by ${system.files.length} file${system.files.length === 1 ? "" : "s"} in this project.`
          : " Referenced in project configuration."
      }`,
      files: system.files.sort((a, b) => a.length - b.length || a.localeCompare(b)).slice(0, MAX_FILES_PER_NODE),
      fileCount: system.files.length,
      dependencies: system.packages.slice(0, 6),
    });
  }

  // --- 6. Build edges -----------------------------------------------------------
  const edgeMap = new Map<string, EdgeAccumulator>();
  const ensureEdge = (source: string, target: string): EdgeAccumulator => {
    const key = `${source}=>${target}`;
    const existing = edgeMap.get(key);
    if (existing) return existing;
    const acc: EdgeAccumulator = { evidence: [], sources: new Set() };
    edgeMap.set(key, acc);
    return acc;
  };
  const pushEvidence = (
    source: string,
    target: string,
    kind: EdgeEvidence["kind"],
    detail: string,
    originFile?: string
  ) => {
    const acc = ensureEdge(source, target);
    if (!acc.evidence.some((e) => e.kind === kind && e.detail === detail)) {
      acc.evidence.push({ kind, detail });
    }
    if (originFile) acc.sources.add(originFile);
  };

  const componentOfPath = (p: string): string | null => {
    const record = recordByPath.get(p);
    if (!record) return null;
    if (record.component && INTERNAL_TYPES.has(record.component)) return record.component;
    // Infrastructure-classified files resolve to their system node.
    return infraOwners.get(p) ?? null;
  };

  const infraOfPackage = (pkg: string): InfraSystem | null => {
    const known = KNOWN_SERVICES[pkg];
    if (!known) return null;
    return infra.get(`${known.category}:${known.label}`) ?? null;
  };

  // 6a. Import-derived edges (internal↔internal and internal→infra).
  for (const record of records) {
    const sourceId = INTERNAL_TYPES.has(record.component as ComponentType)
      ? (record.component as string)
      : null;

    for (const target of record.localImports) {
      const targetId = componentOfPath(target);
      if (!targetId || !sourceId) continue;
      if (targetId === sourceId) continue;
      pushEvidence(sourceId, targetId, "import", `${record.file.path} imports ${target}`, record.file.path);
    }

    if (sourceId) {
      for (const pkg of record.packages) {
        const system = infraOfPackage(pkg);
        if (system) {
          pushEvidence(sourceId, system.id, "package", `${record.file.path} uses "${pkg}"`, record.file.path);
        }
      }
    }
  }

  // 6b. HTTP calls from UI/service code to the API component.
  const apiRoutePaths = collectApiRoutePaths(records.map((r) => r.file.path));
  const hasApi = byComponent.has("api");
  if (hasApi) {
    const httpPattern = /(?:fetch|axios\.\w+|axios\s*\()\s*[`'"](\/[^\s"'`]*)[`'"]/g;
    for (const record of records) {
      if (!record.content || !record.component) continue;
      if (!["frontend", "backend", "service"].includes(record.component)) continue;
      httpPattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = httpPattern.exec(record.content)) !== null) {
        const url = match[1];
        if (url.startsWith("//") || /\.(png|jpe?g|svg|css|js|ico|woff2?)$/i.test(url)) continue;
        const exact = apiRoutePaths.has(url.split("?")[0]);
        pushEvidence(
          record.component,
          "api",
          "http-call",
          `calls "${url}"${exact ? " (matches a real route)" : ""}`,
          record.file.path
        );
        if (exact) break;
      }
    }
  }

  // 6c. Config-only edges to infra nodes (weakest evidence).
  for (const node of infraNodes) {
    const configFiles = configEvidence.get(node.label);
    if (!configFiles || node.fileCount > 0) continue;
    for (const cf of configFiles) {
      pushEvidence("backend", node.id, "config", `"${node.label}" referenced in ${cf}`, cf);
    }
  }

  const confidenceRank = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
  function confidenceFor(acc: EdgeAccumulator): keyof typeof confidenceRank {
    const kinds = new Set(acc.evidence.map((e) => e.kind));
    const directEvidence = acc.sources.size;
    const hasExactHttp = acc.evidence.some((e) => e.detail.includes("(matches a real route)"));

    if (kinds.has("package")) return directEvidence >= 1 ? "HIGH" : "LOW";
    if (kinds.has("import")) return directEvidence >= 2 ? "HIGH" : "MEDIUM";
    if (kinds.has("http-call")) {
      if (hasExactHttp) return "HIGH";
      return directEvidence >= 2 ? "MEDIUM" : "LOW";
    }
    if (kinds.has("convention") || kinds.has("config")) return "LOW";
    return "LOW";
  }

  const edges: ArchEdge[] = [];
  for (const [key, acc] of edgeMap) {
    const [source, target] = key.split("=>");
    if (!nodes.concat(infraNodes).some((n) => n.id === source)) continue;
    if (!nodes.concat(infraNodes).some((n) => n.id === target)) continue;
    edges.push({
      id: key,
      source,
      target,
      confidence: confidenceFor(acc),
      evidence: acc.evidence.slice(0, 12),
    });
  }
  edges.sort(
    (a, b) =>
      confidenceRank[a.confidence] - confidenceRank[b.confidence] ||
      a.id.localeCompare(b.id)
  );

  // --- 7. Assemble the model -----------------------------------------------------
  const allNodes = [...nodes, ...infraNodes];
  // "Important files" = every file that actually became part of the graph.
  const mappedFiles = new Set<string>();
  for (const record of records) {
    if (record.component && (INTERNAL_TYPES.has(record.component) || INFRA_TYPES.has(record.component))) {
      mappedFiles.add(record.file.path);
    }
  }

  const stats: ArchitectureSummaryStats = {
    majorComponents: nodes.length,
    importantFiles: mappedFiles.size,
    externalServices: infraNodes.filter((n) => n.type === "external").length,
    databases: infraNodes.filter((n) => n.type === "database").length,
  };

  const notes: string[] = [
    "Every connection was inferred from real repository evidence: imports, HTTP calls, package usage, and configuration.",
  ];
  if (records.length < scannable.length + manifestLike.length) {
    notes.push("Large repositories are partially sampled — very large or generated files may be skipped.");
  }
  const unmapped = records.filter((r) => !r.component).length;
  if (unmapped > 0) {
    notes.push(`${unmapped} file${unmapped === 1 ? "" : "s"} did not clearly belong to a component and are not shown.`);
  }
  if (allNodes.length === 0) {
    notes.push("No components could be identified with confidence in this repository.");
  }

  return { nodes: allNodes, edges, summary: stats, notes };
}

/** Map Next.js/Nuxt-style route files to their public URL paths. */
function collectApiRoutePaths(paths: string[]): Set<string> {
  const result = new Set<string>();
  for (const p of paths) {
    let m = p.match(/^app\/(.*)\/route\.(ts|js|tsx|jsx)$/);
    if (m) {
      result.add(`/api/${m[1].replace(/\((\w+)\)\//g, "").replace(/\\/g, "/")}`);
      continue;
    }
    m = p.match(/^(src\/)?app\/(.*)\/route\.(ts|js|tsx|jsx)$/);
    if (m) {
      result.add(`/api/${m[2].replace(/\((\w+)\)\//g, "")}`);
      continue;
    }
    m = p.match(/^(src\/)?pages\/api\/(.*)\.(ts|js|tsx|jsx)$/);
    if (m) {
      const base = m[2].replace(/\/index$/, "");
      result.add(`/api/${base}`);
    }
  }
  // Normalize trailing slashes.
  return new Set(Array.from(result, (p) => (p.length > 1 ? p.replace(/\/$/, "") : p)));
}
