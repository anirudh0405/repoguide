// pgvector retrieval. Searches are always scoped to a single project id so a
// user can never retrieve code from another project's repository.

import "server-only";

import { getPrisma } from "@/lib/db";

export interface VectorChunkResult {
  chunkId: string;
  filePath: string;
  chunkIndex: number;
  startLine: number;
  endLine: number;
  content: string;
  distance: number;
}

export function getMaxChatTopK(): number {
  const parsed = Number.parseInt(process.env.AI_CHAT_TOP_K ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 8;
}

/**
 * Finds the chunks whose embedding is closest to `embedding`, restricted to
 * `projectId`. Uses cosine distance (`<=>`) on halfvec for HNSW index usage.
 * The HNSW index is created on ("vector"::halfvec(3072)) with halfvec_cosine_ops.
 */
export async function searchChunks(
  projectId: string,
  embedding: number[],
  limit: number
): Promise<VectorChunkResult[]> {
  const prisma = getPrisma();
  if (!prisma) return [];

  // Postgres can't cast a JS array literal to vector, so interpolate the
  // embedding as a pgvector string literal (`[x,y,z]`) like the indexer does.
  const literal = `[${embedding.join(",")}]`;

  const rows = await prisma.$queryRawUnsafe<
    {
      id: string;
      filePath: string;
      chunkIndex: number;
      startLine: number;
      endLine: number;
      content: string;
      distance: number | string;
    }[]
  >(
    `SELECT "id", "filePath", "chunkIndex", "startLine", "endLine", "content",
            ("vector"::halfvec(3072) <=> $2::halfvec(3072)) AS distance
     FROM "FileChunk"
     WHERE "projectId" = $1 AND "vector" IS NOT NULL
     ORDER BY "vector"::halfvec(3072) <=> $2::halfvec(3072)
     LIMIT $3`,
    projectId,
    literal,
    limit
  );

  return rows.map((row) => ({
    chunkId: row.id,
    filePath: row.filePath,
    chunkIndex: row.chunkIndex,
    startLine: row.startLine,
    endLine: row.endLine,
    content: row.content,
    distance: typeof row.distance === "number" ? row.distance : Number(row.distance),
  }));
}