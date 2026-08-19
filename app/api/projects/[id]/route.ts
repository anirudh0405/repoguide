import { NextRequest, NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import type { AnalysisSummary } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
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
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });
  const dependencies = await prisma.dependency.findMany({
    where: { projectId: id },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  const sourceFileCount = await prisma.sourceFile.count({ where: { projectId: id } });

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      createdAt: project.createdAt.toISOString(),
    },
    repository: {
      owner: project.repository.owner,
      name: project.repository.name,
      fullName: project.repository.fullName,
      description: project.repository.description,
      language: project.repository.language,
      visibility: project.repository.visibility,
      stars: project.repository.stars,
      defaultBranch: project.repository.defaultBranch,
      url: project.repository.url,
    },
    analysis: analysis
      ? {
          id: analysis.id,
          status: analysis.status,
          step: analysis.step,
          error: analysis.error,
          summary: analysis.summary as AnalysisSummary | null,
          startedAt: analysis.startedAt?.toISOString() ?? null,
          completedAt: analysis.completedAt?.toISOString() ?? null,
          createdAt: analysis.createdAt.toISOString(),
        }
      : null,
    dependencies: dependencies.map((dep) => ({
      name: dep.name,
      version: dep.version,
      type: dep.type,
      scope: dep.scope,
    })),
    sourceFileCount,
  });
}