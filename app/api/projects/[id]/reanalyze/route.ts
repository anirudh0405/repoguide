import { NextRequest, NextResponse } from "next/server";

import { startAnalysis } from "@/lib/analyzer";
import { getSessionUserId } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import {
  getCommitSha,
  getFreshUserAccessToken,
} from "@/lib/github";

interface RouteContext {
  params: Promise<{ id: string }>;
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

  // Check if there's already an active analysis
  const activeAnalysis = await prisma.analysis.findFirst({
    where: {
      projectId: id,
      status: { in: ["QUEUED", "DOWNLOADING", "PARSING", "ANALYZING"] },
    },
  });

  if (activeAnalysis) {
    return NextResponse.json(
      { error: "Analysis already in progress", analysisId: activeAnalysis.id },
      { status: 409 }
    );
  }

  // Get the latest commit SHA from GitHub
  const account = await prisma.gitHubAccount.findUnique({ where: { userId } });
  if (!account || !account.accessToken) {
    return NextResponse.json(
      { error: "Your GitHub account is no longer connected. Reconnect and try again." },
      { status: 401 }
    );
  }

  const userToken = await getFreshUserAccessToken(account);
  const repo = project.repository;
  const defaultBranch = repo.defaultBranch || "main";

  // Check if the repository has changed since last analysis
  const latestCommitSha = await getCommitSha(userToken, repo.owner, repo.name, defaultBranch);
  const lastAnalysis = await prisma.analysis.findFirst({
    where: { projectId: id, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
  });

  if (lastAnalysis?.commitSha && latestCommitSha === lastAnalysis.commitSha) {
    return NextResponse.json({
      message: "Repository has not changed since last analysis",
      commitSha: latestCommitSha,
      lastAnalyzedAt: lastAnalysis.completedAt,
      skipped: true,
    });
  }

  // Start new analysis
  await prisma.project.update({ where: { id }, data: { status: "QUEUED" } });
  startAnalysis(id);

  return NextResponse.json({
    projectId: id,
    status: "QUEUED",
    commitSha: latestCommitSha,
    message: latestCommitSha
      ? "Repository has changes. Starting re-analysis..."
      : "Starting analysis...",
  });
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

  const account = await prisma.gitHubAccount.findUnique({ where: { userId } });
  if (!account || !account.accessToken) {
    return NextResponse.json(
      { error: "GitHub account not connected" },
      { status: 401 }
    );
  }

  const userToken = await getFreshUserAccessToken(account);
  const repo = project.repository;
  const defaultBranch = repo.defaultBranch || "main";

  const latestCommitSha = await getCommitSha(userToken, repo.owner, repo.name, defaultBranch);
  const lastAnalysis = await prisma.analysis.findFirst({
    where: { projectId: id, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
  });

  return NextResponse.json({
    currentCommitSha: latestCommitSha,
    lastAnalyzedCommitSha: lastAnalysis?.commitSha ?? null,
    lastAnalyzedAt: lastAnalysis?.completedAt ?? null,
    hasChanges: lastAnalysis?.commitSha !== null && latestCommitSha !== lastAnalysis?.commitSha,
    canReanalyze: true,
  });
}