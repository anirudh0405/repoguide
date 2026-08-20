import { NextRequest, NextResponse } from "next/server";

import { isEmbeddingConfigured } from "@/lib/ai/embedding-provider";
import { startIndexing } from "@/lib/ai/indexer";
import { getSessionUserId } from "@/lib/auth";
import { getPrisma } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function serializeIndex(index: {
  status: string;
  step: string | null;
  error: string | null;
  chunkCount: number;
  model: string | null;
  commitSha: string | null;
  updatedAt: Date;
} | null) {
  return index
    ? {
        status: index.status,
        step: index.step,
        error: index.error,
        chunkCount: index.chunkCount,
        model: index.model,
        commitSha: index.commitSha,
        updatedAt: index.updatedAt.toISOString(),
      }
    : null;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await context.params;
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  }

  const project = await prisma.project.findFirst({
    where: { id, userId },
    include: { repository: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const index = await prisma.codeIndex.findUnique({ where: { projectId: id } });

  return NextResponse.json({
    index: serializeIndex(index),
    configured: isEmbeddingConfigured(),
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await context.params;
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  }

  const project = await prisma.project.findFirst({
    where: { id, userId },
    include: { repository: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!isEmbeddingConfigured()) {
    return NextResponse.json(
      { error: "Embeddings are not configured. Add NVIDIA_API_KEY to the server environment." },
      { status: 503 }
    );
  }

  const analysis = await prisma.analysis.findFirst({
    where: { projectId: id, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
  });
  if (!analysis?.commitSha) {
    return NextResponse.json(
      { error: "Analyze the repository first. An index is built from the completed analysis." },
      { status: 400 }
    );
  }

  const existing = await prisma.codeIndex.findUnique({ where: { projectId: id } });
  if (existing && existing.status === "INDEXING") {
    return NextResponse.json(
      { index: serializeIndex(existing), indexing: true },
      { status: 202 }
    );
  }

  startIndexing(id);

  const index = await prisma.codeIndex.upsert({
    where: { projectId: id },
    update: { status: "INDEXING", step: "download", error: null },
    create: { projectId: id, status: "INDEXING", step: "download" },
  });

  return NextResponse.json({ index: serializeIndex(index), indexing: true }, { status: 202 });
}