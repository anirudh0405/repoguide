// Deterministic AI context selection.
//
// Only a small, prioritized slice of a repository is ever sent to the model:
// README, manifests, entry points, configuration, auth/database/API files, and
// other important files first. Sensitive files are never read, content is
// redacted, and the whole payload is capped by configurable file/count/token
// limits so we never pay for (or leak) more than necessary.

import type { AnalysisSummary } from "@/lib/types";

export interface ContextRepository {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  commitSha: string | null;
}

export interface ContextFile {
  path: string;
  language: string | null;
  lineCount: number;
  size: number;
}

export interface PreparedFile {
  path: string;
  language: string | null;
  excerpt: string;
}

export interface PreparedContext {
  repository: ContextRepository;
  summary: {
    fileCount: number;
    lineCount: number;
    languages: Record<string, { files: number; lines: number }>;
    frameworks: string[];
    packageManagers: string[];
    topDependencies: string[];
    entryPoints: string[];
    importantFiles: { path: string; kind: string }[];
    directoryTree: string;
  };
  files: PreparedFile[];
  excludedSensitive: string[];
  totalCharacters: number;
  estimatedPromptTokens: number;
}

// --- Configuration (all optional, with sensible defaults) -------------------

export function getMaxContextFiles(): number {
  const parsed = Number.parseInt(process.env.AI_MAX_FILES ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 25;
}

export function getMaxContextTokens(): number {
  const parsed = Number.parseInt(process.env.AI_MAX_CONTEXT_TOKENS ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5_500;
}

export function getMaxFileSizeBytes(): number {
  const parsed = Number.parseInt(process.env.AI_MAX_FILE_SIZE ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 64 * 1024;
}

// --- Sensitive file protection ----------------------------------------------

const SENSITIVE_EXTENSIONS = new Set(["pem", "key", "p12", "pfx", "p8", "ppk", "pem.pub"]);
const SENSITIVE_NAMES = new Set([
  ".env",
  ".env.example", // example values are safe to show (names), but never real .env
  ".npmrc",
  ".pypirc",
  ".netrc",
  ".htpasswd",
  "credentials.json",
  "secrets.json",
  "service-account.json",
  "id_rsa",
  "id_ed25519",
  "id_dsa",
  ".dockercfg",
  "auth.json",
  "client-secret.json",
]);

export function isSensitivePath(path: string): boolean {
  const lower = path.toLowerCase();
  const segments = lower.split("/");
  const base = segments[segments.length - 1];

  if (base.startsWith(".env")) return true; // .env, .env.local, .env.production …
  if (/\.(pem|key|p12|pfx|p8|ppk|pem\.pub)$/.test(base)) return true;
  if (SENSITIVE_NAMES.has(base)) return true;
  if (lower.includes("/.ssh/")) return true;
  if (lower.includes("secret") && /\.(json|ya?ml|toml)$/.test(base)) return true;
  void SENSITIVE_EXTENSIONS;
  return false;
}

// --- Secret redaction -------------------------------------------------------

const TOKEN_PATTERNS = [
  /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}/g,
  /sk-[A-Za-z0-9_-]{20,}/g,
  /nvapi-[A-Za-z0-9_-]{20,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /AIza[0-9A-Za-z_-]{20,}/g,
  /xox[baprs]-[A-Za-z0-9-]{10,}/g,
];

function redactTokenLike(text: string): string {
  let out = text;
  for (const pattern of TOKEN_PATTERNS) {
    out = out.replace(pattern, "<REDACTED>");
  }
  return out;
}

export function redactSecrets(text: string): string {
  let out = text;

  // Secret blocks (private keys, certificates).
  out = out.replace(/-----BEGIN[^-]*-----[\s\S]*?-----END[^-]*-----/g, "<REDACTED>");

  // KEY=value and KEY: value assignments where the key looks sensitive.
  out = out.replace(
    /^(\s*["']?[A-Za-z0-9_.-]*?(?:secret|password|token|api_key|apikey|private_key|access_key|client_secret|database_url|connection_string|session_secret|jwt_secret|password)[A-Za-z0-9_.-]*["']?\s*[:=]\s*)["']?[^\s"',}]+["']?.*$/gim,
    "$1<REDACTED>"
  );

  out = redactTokenLike(out);
  return out;
}

// --- Priority scoring -------------------------------------------------------

function baseName(path: string): string {
  return path.split("/").pop() ?? path;
}

function pathIsEntryPoint(path: string, entryPoints: Set<string>): number {
  return entryPoints.has(path) ? 1 : 0;
}

function fileScore(path: string): number {
  const name = baseName(path).toLowerCase();
  const lower = path.toLowerCase();

  // README — always the highest priority.
  if (/^readme/i.test(name)) return 100;

  // Package / dependency manifests.
  if (
    name === "package.json" ||
    name === "pyproject.toml" ||
    name === "requirements.txt" ||
    name === "go.mod" ||
    name === "cargo.toml" ||
    name === "pom.xml" ||
    name === "build.gradle" ||
    name === "build.gradle.kts" ||
    name === "composer.json" ||
    name === "gemfile" ||
    name === "setup.py"
  ) {
    return 95;
  }

  // Environment variable names (safe: example files only).
  if (name === ".env.example" || name === ".env.sample" || name === "env.example") return 85;

  // Authentication.
  if (/(auth|login|logout|session|oauth|jwt|middleware|permission|authorization|rbac)/.test(lower)) {
    return 82;
  }

  // Database.
  if (
    /(schema\.prisma|drizzle|migration|migrations|\.sql$|database|datastore|repositor)/.test(lower)
  ) {
    return 78;
  }

  // API routes / controllers.
  if (
    /(app\/api\/|pages\/api\/|route\.(ts|js|tsx|jsx)$|controllers|urls\.py|api\/v\d)/.test(lower)
  ) {
    return 75;
  }

  // Entry points / application bootstrap.
  if (
    name === "main.ts" ||
    name === "main.js" ||
    name === "index.ts" ||
    name === "index.js" ||
    name === "server.ts" ||
    name === "server.js" ||
    name === "app.ts" ||
    name === "manage.py" ||
    name === "main.go" ||
    name === "wsgi.py" ||
    name === "asgi.py" ||
    name === "application.java" ||
    name === "main.py"
  ) {
    return 80;
  }

  // Configuration.
  if (
    /^(tsconfig|next\.config|vite\.config|webpack\.config|tailwind\.config|eslint|prettier|jest|vitest|drizzle\.config|nx|turbo|babel)/.test(
      name
    ) ||
    /dockerfile|docker-compose|\.github\/workflows|\.gitlab-ci|\.circleci|jenkinsfile/.test(lower)
  ) {
    return 70;
  }

  // Core services / business logic.
  if (/(^|\/)(services?|lib|core|utils?|helpers?|domain|application)\//.test(lower)) {
    return 65;
  }

  // Framework routes / components.
  if (
    /(^|\/)(app|src\/app|pages|src\/pages|src\/components|components)\//.test(lower) &&
    /\.(tsx|jsx|ts|js|vue|svelte)$/.test(name)
  ) {
    return 55;
  }

  // Tests — lowest priority but still useful for understanding.
  if (/\.(test|spec)\.|__tests__|tests?\/|_test\.|test_/.test(lower)) return 30;

  return 40;
}

// --- Selection --------------------------------------------------------------

export function selectContextFiles(
  files: ContextFile[],
  summary: AnalysisSummary,
  limit: number
): ContextFile[] {
  const entryPoints = new Set(summary.entryPoints.map((entry) => entry.path));

  const scored = files
    .filter((file) => !isSensitivePath(file.path))
    .map((file) => {
      let score = fileScore(file.path);
      if (summary.importantFiles.some((important) => important.path === file.path)) score += 12;
      if (pathIsEntryPoint(file.path, entryPoints)) score += 8;
      return { file, score };
    });

  scored.sort((a, b) => b.score - a.score || a.file.lineCount - b.file.lineCount);
  return scored.slice(0, limit).map(({ file }) => file);
}

function estimateChars(tokens: number): number {
  return tokens * 4;
}

// --- Public builder ---------------------------------------------------------

export interface BuildContextInput {
  repository: ContextRepository;
  summary: AnalysisSummary;
  files: ContextFile[];
  dependencies: { name: string; version: string | null; type: string }[];
  readFile: (path: string) => Promise<string | null>;
}

/**
 * Estimates token count from character count (rough approximation: 1 token ≈ 4 chars).
 */
function estimateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

/**
 * Estimates the token count of the system prompt + user prompt wrapper.
 * This is the overhead before file content is added.
 */
function estimatePromptOverheadTokens(): number {
  // System prompt (~1,200 chars) + user prompt wrapper (~500 chars) + JSON structure overhead
  return 600;
}

export async function buildAIContext(input: BuildContextInput): Promise<PreparedContext> {
  const { repository, summary, files, dependencies, readFile } = input;

  const maxFiles = getMaxContextFiles();
  const maxFileBytes = getMaxFileSizeBytes();
  const maxContextTokens = getMaxContextTokens();

  // Reserve tokens for: prompt overhead + response budget (max_tokens=4000 for structured)
  // We need: prompt_tokens + max_tokens <= 8000 (TPM limit)
  // So: prompt_tokens <= 8000 - 4000 = 4000
  // But we stay conservative: keep prompt tokens <= 5500 (leaving 2500 for response)
  const promptTokenBudget = Math.min(maxContextTokens, 5500);
  const promptOverheadTokens = estimatePromptOverheadTokens();
  const availableContentTokens = Math.max(0, promptTokenBudget - promptOverheadTokens);
  const contentChars = availableContentTokens * 4; // ~4 chars per token

  const selected = selectContextFiles(files, summary, maxFiles * 2);
  const excludedSensitive = files
    .filter((file) => isSensitivePath(file.path))
    .map((file) => file.path);

  const prepared: PreparedFile[] = [];
  let usedChars = 0;
  let estimatedPromptTokens = promptOverheadTokens;

  for (const file of selected) {
    if (prepared.length >= maxFiles) break;
    if (contentChars - usedChars < 500) break;

    let raw: string | null = null;
    try {
      raw = await readFile(file.path);
    } catch {
      raw = null;
    }
    if (!raw) continue;

    let excerpt = raw.slice(0, maxFileBytes);
    excerpt = redactSecrets(excerpt);

    const remaining = contentChars - usedChars;
    if (excerpt.length > remaining) {
      excerpt = excerpt.slice(0, Math.max(0, remaining - 200));
    }
    if (excerpt.trim().length === 0) continue;

    prepared.push({
      path: file.path,
      language: file.language,
      excerpt,
    });
    usedChars += excerpt.length;
    estimatedPromptTokens = promptOverheadTokens + estimateTokens(usedChars);
  }

  const topDependencies = dependencies
    .sort((a, b) => (b.version ? 1 : 0) - (a.version ? 1 : 0))
    .slice(0, 30) // Reduced from 40 to save tokens
    .map((dep) => `${dep.type}:${dep.name}`);

  return {
    repository,
    summary: {
      fileCount: summary.fileCount,
      lineCount: summary.lineCount,
      languages: summary.languages,
      frameworks: summary.frameworks,
      packageManagers: summary.packageManagers,
      topDependencies,
      entryPoints: summary.entryPoints.map((entry) => entry.path),
      importantFiles: summary.importantFiles,
      directoryTree: summary.directoryTree,
    },
    files: prepared,
    excludedSensitive,
    totalCharacters: usedChars,
    estimatedPromptTokens,
  };
}