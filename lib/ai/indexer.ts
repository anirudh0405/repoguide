// Semantic indexer (Phase 5). Turns a Phase 3 analysis into embeddable code
// chunks stored with pgvector embeddings, so questions can be answered with
// actual repository content.
//
// Runs fully server-side. Files that are binary, generated, dependency
// lockfiles, or sensitive (.env, keys, …) are never embedded. The exact
// analyzed commit is downloaded, chunked, embedded, and discarded — the index
// stores only the resulting chunks, never the raw repository.

import "server-only";

import { readFile as readFileNode } from "node:fs/promises";
import { join } from "node:path";

import { AIError } from "@/lib/ai/ai-provider";
import { chunkCode, estimateTokens, type CodeChunk } from "@/lib/ai/chunker";
import { isSensitivePath } from "@/lib/ai/context";
import { getEmbeddingProvider } from "@/lib/ai/embedding-provider";
import { createTempDir, downloadAndExtract, removeTempDir } from "@/lib/analyzer/ingest";
import { getPrisma } from "@/lib/db";
import { getFreshUserAccessToken } from "@/lib/github";

export type IndexStatus = "INDEXING" | "COMPLETED" | "FAILED" | "EMPTY";
export type IndexStep = "download" | "chunk" | "embed" | "store";

function getMaxIndexFiles(): number {
  const parsed = Number.parseInt(process.env.AI_INDEX_MAX_FILES ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 300;
}

function getMaxIndexChunks(): number {
  const parsed = Number.parseInt(process.env.AI_INDEX_MAX_CHUNKS ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20_000;
}

function getMaxChunkBytes(): number {
  const parsed = Number.parseInt(process.env.AI_INDEX_MAX_FILE_BYTES ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 512 * 1024;
}

// Files that are never useful to embed: generated output, lockfiles, and
// sensitive material. Binaries were already excluded during analysis.
const LOCKFILE_NAMES = new Set([
  "package-lock.json",
  "npm-shrinkwrap.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "pnpm-lock.yml",
  "poetry.lock",
  "Pipfile.lock",
  "Cargo.lock",
  "Gemfile.lock",
  "composer.lock",
  "go.sum",
  "flake.lock",
  "bun.lock",
  "bun.lockb",
  "pubspec.lock",
  "mix.lock",
]);

function shouldIndexFile(path: string): boolean {
  const lower = path.toLowerCase();
  const base = lower.split("/").pop() ?? "";

  if (isSensitivePath(path)) return false;
  if (LOCKFILE_NAMES.has(base)) return false;
  if (/\.(lock|lockb)$/.test(base)) return false;
  if (/\.(min\.js|min\.css|map)$/.test(base)) return false;
  if (/(^|\/)(dist|build|out|coverage|\.next|\.nuxt|\.output|generated|gen|vendor)\//.test(lower))
    return false;

  return true;
}

interface PendingChunk {
  fileId: string;
  filePath: string;
  chunkIndex: number;
  chunk: CodeChunk;
}

export async function runIndexing(projectId: string): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) return;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { repository: true },
  });
  if (!project) return;

  const analysis = await prisma.analysis.findFirst({
    where: { projectId, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
  });
  if (!analysis?.commitSha) {
    await prisma.codeIndex.upsert({
      where: { projectId },
      update: { status: "FAILED", error: "Analyze the repository first.", step: null },
      create: { projectId, status: "FAILED", error: "Analyze the repository first." },
    });
    return;
  }

  const index = await prisma.codeIndex.upsert({
    where: { projectId },
    update: { status: "INDEXING", step: "download", error: null },
    create: { projectId, status: "INDEXING", step: "download" },
  });

  const setStep = (step: IndexStep): Promise<unknown> =>
    prisma.codeIndex.update({ where: { id: index.id }, data: { step } });

  const markFailed = (error: unknown): Promise<unknown> =>
    prisma.codeIndex.update({
      where: { id: index.id },
      data: { status: "FAILED", step: null, error: errorMessage(error) },
    });

  let tempDir: string | null = null;
  try {
    const account = await prisma.gitHubAccount.findUnique({ where: { userId: project.userId } });
    if (!account || !account.accessToken) {
      throw new AIError(
        "MODEL_ERROR",
        "Your GitHub account is no longer connected. Reconnect and try again."
      );
    }
    const userToken = await getFreshUserAccessToken(account);

    const repo = project.repository;
    const sourceFiles = await prisma.sourceFile.findMany({
      where: { projectId },
      orderBy: { path: "asc" },
    });
    const eligible = sourceFiles
      .filter((file) => shouldIndexFile(file.path))
      .slice(0, getMaxIndexFiles());

    tempDir = await createTempDir();
    const rootDir = await downloadAndExtract(
      repo.owner,
      repo.name,
      analysis.commitSha,
      tempDir,
      userToken
    );

    await setStep("chunk");
    const chunks: PendingChunk[] = [];
    for (const file of eligible) {
      let raw: string | null = null;
      try {
        raw = await readFileNode(join(rootDir, file.path), "utf8");
      } catch {
        raw = null;
      }
      if (!raw) continue;
      if (Buffer.byteLength(raw, "utf8") > getMaxChunkBytes()) continue;

      const split = chunkCode(raw);
      for (let i = 0; i < split.length; i += 1) {
        chunks.push({ fileId: file.id, filePath: file.path, chunkIndex: i, chunk: split[i] });
        if (chunks.length >= getMaxIndexChunks()) break;
      }
      if (chunks.length >= getMaxIndexChunks()) break;
    }

    if (chunks.length === 0) {
      await prisma.codeIndex.update({
        where: { id: index.id },
        data: {
          status: "EMPTY",
          step: null,
          chunkCount: 0,
          commitSha: analysis.commitSha,
          analysisId: analysis.id,
        },
      });
      return;
    }

    await setStep("embed");
    const provider = getEmbeddingProvider();

    const vectors: number[][] = [];
    for (let i = 0; i < chunks.length; i += 64) {
      const batch = chunks.slice(i, i + 64);
      const embedded = await provider.embedTexts(
        batch.map((entry) => entry.chunk.content),
        "passage"
      );
      vectors.push(...embedded);
    }

    // Replace the previous index for this project.
    await prisma.fileChunk.deleteMany({ where: { projectId } });

    await setStep("store");
    let inserted = 0;
    for (let i = 0; i < chunks.length; i += 50) {
      const batch = chunks.slice(i, i + 50);
      const created = await Promise.all(
        batch.map((entry) =>
          prisma.fileChunk.create({
            data: {
              projectId,
              fileId: entry.fileId,
              filePath: entry.filePath,
              chunkIndex: entry.chunkIndex,
              content: entry.chunk.content,
              startLine: entry.chunk.startLine,
              endLine: entry.chunk.endLine,
              tokenCount: estimateTokens(entry.chunk.content),
            },
          })
        )
      );
      await applyVectors(
        created.map((row, offset) => ({ id: row.id, vector: vectors[i + offset] }))
      );
      inserted += created.length;
    }

    await prisma.codeIndex.update({
      where: { id: index.id },
      data: {
        status: "COMPLETED",
        step: null,
        error: null,
        chunkCount: inserted,
        commitSha: analysis.commitSha,
        analysisId: analysis.id,
        model: provider.model,
      },
    });
  } catch (error) {
    console.error("[indexer] failed:", error);
    await markFailed(error);
  } finally {
    if (tempDir) {
      await removeTempDir(tempDir);
    }
  }
}

// Update a batch of chunk vectors in one round trip using a VALUES list.
async function applyVectors(rows: { id: string; vector: number[] }[]): Promise<void> {
  const prisma = getPrisma();
  if (!prisma || rows.length === 0) return;

  const placeholders: string[] = [];
  const params: unknown[] = [];
  rows.forEach((row, offset) => {
    const base = offset * 2 + 1;
    placeholders.push(`($${base}::text, $${base + 1}::vector)`);
    params.push(row.id, row.vector);
  });

  await prisma.$queryRawUnsafe(
    `UPDATE "FileChunk" AS fc
     SET "vector" = v.vec
     FROM (VALUES ${placeholders.join(", ")}) AS v(id, vec)
     WHERE fc.id = v.id`,
    ...params
  );
}

export function startIndexing(projectId: string): void {
  void runIndexing(projectId);
}

function errorMessage(error: unknown): string {
  if (error instanceof AIError || error instanceof Error) return error.message;
  return "Indexing the repository failed unexpectedly.";
}