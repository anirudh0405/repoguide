// Language detection: maps file extensions to a display language name.
// Detection is purely based on extension (deterministic), which is reliable
// for the vast majority of source files.

const EXTENSION_LANGUAGES: Record<string, string> = {
  ts: "TypeScript",
  mts: "TypeScript",
  cts: "TypeScript",
  tsx: "TypeScript",
  js: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  jsx: "JavaScript",
  py: "Python",
  pyi: "Python",
  java: "Java",
  kt: "Kotlin",
  kts: "Kotlin",
  cpp: "C++",
  cc: "C++",
  cxx: "C++",
  c: "C",
  h: "C",
  hpp: "C++",
  hh: "C++",
  hxx: "C++",
  cs: "C#",
  go: "Go",
  rs: "Rust",
  rb: "Ruby",
  php: "PHP",
  swift: "Swift",
  scala: "Scala",
  dart: "Dart",
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  fish: "Shell",
  ps1: "PowerShell",
  html: "HTML",
  htm: "HTML",
  css: "CSS",
  scss: "SCSS",
  sass: "Sass",
  less: "Less",
  vue: "Vue",
  svelte: "Svelte",
  astro: "Astro",
  sql: "SQL",
  json: "JSON",
  jsonc: "JSON",
  yaml: "YAML",
  yml: "YAML",
  toml: "TOML",
  xml: "XML",
  md: "Markdown",
  markdown: "Markdown",
  rmd: "R Markdown",
  txt: "Text",
  prisma: "Prisma",
  graphql: "GraphQL",
  gql: "GraphQL",
  proto: "Protocol Buffers",
  lua: "Lua",
  r: "R",
  ex: "Elixir",
  exs: "Elixir",
  clj: "Clojure",
  cljs: "Clojure",
  hs: "Haskell",
  ml: "OCaml",
  m: "Objective-C",
  mm: "Objective-C",
  zig: "Zig",
  nim: "Nim",
  sol: "Solidity",
  tf: "Terraform",
  hcl: "HCL",
  dockerfile: "Dockerfile",
  ini: "INI",
  conf: "Configuration",
  cfg: "Configuration",
  properties: "Properties",
  env: "Environment",
  dockerignore: "Docker",
  lock: "Lockfile",
};

// File extensions that are never ingested because they are binary assets,
// archives, media, or other non-source files.
const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "svg", "bmp", "webp", "avif", "heic", "ico", "tiff", "tif",
  "mp4", "mov", "avi", "mkv", "webm", "m4v", "wmv", "flv",
  "mp3", "wav", "ogg", "flac", "aac", "m4a", "wma",
  "zip", "tar", "gz", "tgz", "bz2", "xz", "7z", "rar",
  "exe", "dll", "so", "dylib", "bin", "o", "obj", "class", "jar", "war", "ear", "wasm",
  "woff", "woff2", "ttf", "otf", "eot",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "psd", "ai", "sketch", "fig", "xcf", "heic",
  "db", "sqlite", "sqlite3", "sqlitedb", "parquet", "avro",
]);

export function detectLanguage(fileName: string, extension: string): string | null {
  const name = fileName.toLowerCase();
  if (name === "dockerfile") return "Dockerfile";
  const lower = extension.toLowerCase();
  return EXTENSION_LANGUAGES[lower] ?? null;
}

export function isBinaryExtension(extension: string): boolean {
  return BINARY_EXTENSIONS.has(extension.toLowerCase());
}

// Heuristic content check for binary data (e.g. files with misleading
// extensions, or null bytes in the first bytes).
export function isBinaryContent(buffer: Buffer): boolean {
  const sampleLength = Math.min(buffer.length, 8000);
  for (let i = 0; i < sampleLength; i += 1) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

export function countLines(buffer: Buffer): number {
  let lines = 0;
  const len = buffer.length;
  for (let i = 0; i < len; i += 1) {
    if (buffer[i] === 10) lines += 1;
  }
  // A trailing newline means the last line is empty; text without a trailing
  // newline still has one line.
  return len > 0 && buffer[len - 1] === 10 ? lines : lines + 1;
}