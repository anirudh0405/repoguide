import { NextRequest, NextResponse } from "next/server";

import {
  startArchitectureGraph,
} from "@/lib/architecture/generator";
import type {
  ArchitectureModel,
  ArchitectureStatus,
} from "@/lib/architecture/types";
import { getSessionUserId } from "@/lib/auth";
import { getPrisma } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function serializeGraph(graph: {
  id: string;
  status: string;
  step: string | null;
  error: string | null;
  commitSha: string | null;
  analysisId: string | null;
  content: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: graph.id,
    status: graph.status as ArchitectureStatus,
    step: graph.step,
    error: graph.error,
    commitSha: graph.commitSha,
    analysisId: graph.analysisId,
    content: graph.content as ArchitectureModel | null,
    createdAt: graph.createdAt.toISOString(),
    updatedAt: graph.updatedAt.toISOString(),
  };
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

  const analysis = await prisma.analysis.findFirst({
    where: { projectId: id, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
  });
  const graph = await prisma.architectureGraph.findFirst({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });

  const outdated = Boolean(
    graph &&
      analysis &&
      graph.analysisId === analysis.id &&
      analysis.commitSha &&
      graph.commitSha !== analysis.commitSha
  );

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      repository: {
        fullName: project.repository.fullName,
        defaultBranch: project.repository.defaultBranch,
      },
    },
    analysis: analysis
      ? {
          id: analysis.id,
          status: analysis.status,
          commitSha: analysis.commitSha,
          completedAt: analysis.completedAt?.toISOString() ?? null,
        }
      : null,
    graph: graph ? serializeGraph(graph) : null,
    outdated,
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

  const analysis = await prisma.analysis.findFirst({
    where: { projectId: id, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
  });
  if (!analysis?.summary) {
    return NextResponse.json(
      { error: "Analyze the repository first. The architecture graph is built from the analysis." },
      { status: 400 }
    );
  }

  const existing = await prisma.architectureGraph.findFirst({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });

  // Reuse a finished graph for the same analysis — never regenerate pointlessly.
  if (existing && existing.status === "COMPLETED" && existing.analysisId === analysis.id) {
    return NextResponse.json({ graph: serializeGraph(existing), reused: true });
  }

  // An in-flight build is already running for this analysis.
  if (existing && existing.status === "GENERATING" && existing.analysisId === analysis.id) {
    return NextResponse.json({ graph: serializeGraph(existing), reused: false, generating: true });
  }

  const graph = await prisma.architectureGraph.create({
    data: {
      projectId: id,
      analysisId: analysis.id,
      commitSha: analysis.commitSha,
      status: "GENERATING",
    },
  });

  startArchitectureGraph(id);

  return NextResponse.json({ graph: serializeGraph(graph), reused: false }, { status: 202 });
}
