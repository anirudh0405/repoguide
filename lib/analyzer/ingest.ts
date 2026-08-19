// Repository ingestion: downloads a GitHub repository tarball, extracts it to
// a temp directory, and walks the tree applying ignore rules and size limits.
// This module is intentionally free of server-only/prisma dependencies so the
// pipeline can be exercised outside a running server.

import { createHash } from "node:crypto";
import { createWriteStream as fsCreateWriteStream } from "node:fs";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import * as tar from "tar";

import {
  GitIgnoreResolver,
  getMaxFileBytes,
  type IngestedFile,
} from "@/lib/analyzer/ignore";
import {
  countLines,
  detectLanguage,
  isBinaryContent,
  isBinaryExtension,
} from "@/lib/analyzer/languages";

export class IngestError extends Error {}

export async function downloadAndExtract(
  owner: string,
  name: string,
  ref: string,
  destDir: string,
  token?: string
): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${name}/tarball/${encodeURIComponent(ref)}`;
  const headers: Record<string, string> = {
    "User-Agent": "RepoGuide",
    Accept: "application/vnd.github+json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers,
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    throw new IngestError(
      "Timed out downloading the repository. It may be very large — try again."
    );
  }

  if (response.status === 404) {
    throw new IngestError(`Repository ${owner}/${name} was deleted or is no longer accessible.`);
  }
  if (response.status === 403) {
    throw new IngestError(
      "GitHub rate limit reached or the repository is not accessible through this account. Try again shortly."
    );
  }
  if (!response.ok || !response.body) {
    throw new IngestError(`Failed to download repository (HTTP ${response.status}).`);
  }

  const archivePath = join(destDir, "repo.tar.gz");
  await pipeline(Readable.fromWeb(response.body as never), fsCreateWriteStream(archivePath));

  try {
    await tar.x({
      file: archivePath,
      cwd: destDir,
      strict: false,
      filter: (path) => {
        const segments = path.split("/");
        return !segments.includes("..") && !path.startsWith("/");
      },
    });
  } catch {
    throw new IngestError("Could not extract the repository archive (it may be malformed).");
  }

  const entries = await readdir(destDir);
  const rootDir = entries.find((entry) => entry !== "repo.tar.gz");
  if (!rootDir) {
    throw new IngestError("The repository archive was empty.");
  }
  return join(destDir, rootDir);
}

export async function createTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "repoguide-"));
}

export async function removeTempDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true }).catch(() => {});
}

export async function ingestFiles(rootDir: string): Promise<IngestedFile[]> {
  const maxBytes = getMaxFileBytes();
  const resolver = new GitIgnoreResolver(rootDir);
  await resolver.init();

  const files: IngestedFile[] = [];

  async function walk(dirRel: string): Promise<void> {
    const absDir = dirRel ? join(rootDir, dirRel) : rootDir;
    let entries;
    try {
      entries = await readdir(absDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const relPath = dirRel ? `${dirRel}/${entry.name}` : entry.name;
      if (resolver.isIgnored(relPath)) continue;

      if (entry.isDirectory()) {
        await resolver.readGitIgnore(relPath);
        await walk(relPath);
        continue;
      }

      if (!entry.isFile()) continue; // skip symlinks and special files

      const absPath = join(absDir, entry.name);
      let size: number;
      try {
        size = (await stat(absPath)).size;
      } catch {
        continue;
      }
      if (size > maxBytes) continue; // configurable file-size limit

      const extension = extname(entry.name).slice(1).toLowerCase();
      if (isBinaryExtension(extension)) continue;

      let buffer: Buffer;
      try {
        buffer = await readFile(absPath);
      } catch {
        continue;
      }
      if (isBinaryContent(buffer)) continue; // unsupported/malformed content

      files.push({
        path: relPath,
        name: entry.name,
        extension,
        language: detectLanguage(entry.name, extension),
        size,
        lineCount: countLines(buffer),
        hash: createHash("sha256").update(buffer).digest("hex"),
        directory: dirRel,
        absPath,
      });
    }
  }

  await walk("");
  return files;
}