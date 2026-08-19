// .gitignore-aware ignore rules for repository ingestion.
//
// Every file we consider ingesting is checked against:
//   1. a built-in list of paths that are never useful to analyze, and
//   2. the .gitignore files present in the repository (resolved per-directory,
//      matching git semantics where a pattern in dir/.gitignore applies
//      relative to that directory and also to everything beneath it).

import ignore, { type Ignore } from "ignore";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const BUILTIN_IGNORE = [
  ".git",
  "**/.git",
  "node_modules",
  "**/node_modules",
  "dist",
  "**/dist",
  "build",
  "**/build",
  ".next",
  "**/.next",
  "coverage",
  "**/coverage",
  "venv",
  "**/venv",
  ".venv",
  "**/.venv",
  "__pycache__",
  "**/__pycache__",
  ".env",
  "**/.env",
  ".env.*",
  "**/.env.*",
  "*.lock",
  "**/*.lock",
  "*.png",
  "*.jpg",
  "*.jpeg",
  "*.gif",
  "*.svg",
  "*.mp4",
  "*.zip",
  "*.exe",
  ".DS_Store",
  "**/.DS_Store",
  "Thumbs.db",
  "**/Thumbs.db",
  ".idea",
  "**/.idea",
  "*.log",
  "**/*.log",
];

export const DEFAULT_MAX_FILE_BYTES = 1024 * 1024; // 1 MB

function configuredMaxFileBytes(): number {
  const raw = process.env.ANALYSIS_MAX_FILE_BYTES;
  if (!raw) return DEFAULT_MAX_FILE_BYTES;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_FILE_BYTES;
}

export function getMaxFileBytes(): number {
  return configuredMaxFileBytes();
}

export interface IngestedFile {
  path: string;
  name: string;
  extension: string;
  language: string | null;
  size: number;
  lineCount: number;
  hash: string;
  directory: string;
  absPath: string;
}

export interface IgnoreResolver {
  isIgnored(relPath: string): boolean;
  readGitIgnore(dirRel: string): Promise<void>;
}

// A resolver built from a repository root. Reads .gitignore files lazily as
// directories are walked.
export class GitIgnoreResolver implements IgnoreResolver {
  private root: string;
  private rootIgnore: Ignore;
  private dirIgnores: Map<string, Ignore>;

  constructor(root: string) {
    this.root = root;
    this.rootIgnore = ignore().add(BUILTIN_IGNORE);
    this.dirIgnores = new Map();
  }

  async init(): Promise<void> {
    await this.readGitIgnore("");
  }

  async readGitIgnore(dirRel: string): Promise<void> {
    const gitIgnorePath = join(this.root, dirRel, ".gitignore");
    try {
      const content = await readFile(gitIgnorePath, "utf8");
      const instance = ignore().add(content);
      this.dirIgnores.set(dirRel, instance);
    } catch {
      // No .gitignore in this directory.
    }
  }

  isIgnored(relPath: string): boolean {
    const normalized = relPath.replace(/\\/g, "/");
    if (this.rootIgnore.ignores(normalized)) return true;

    const parts = normalized.split("/");
    const parentParts = parts.slice(0, -1);

    // Build the list of ancestor directories, from root to the file's parent.
    const ancestors = [""];
    let current = "";
    for (const part of parentParts) {
      current = current ? `${current}/${part}` : part;
      ancestors.push(current);
    }

    // Check each ancestor's .gitignore, from the immediate parent up to the
    // root. Patterns apply relative to the directory the .gitignore lives in.
    for (let i = ancestors.length - 1; i >= 0; i -= 1) {
      const dirRel = ancestors[i];
      const rule = this.dirIgnores.get(dirRel);
      if (!rule) continue;
      const relativeToDir = dirRel ? normalized.slice(dirRel.length + 1) : normalized;
      if (rule.ignores(relativeToDir)) return true;
    }

    return false;
  }
}