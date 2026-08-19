import { NextRequest, NextResponse } from "next/server";

import { isAIConfigured, getProviderInfo } from "@/lib/ai/ai-provider";
import { startOnboardingGuide, type GuideStatus } from "@/lib/ai/onboarding-generator";
import type { OnboardingGuideContent } from "@/lib/ai/onboarding-schema";
import { getSessionUserId } from "@/lib/auth";
import { getPrisma } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function serializeGuide(guide: {
  id: string;
  status: string;
  step: string | null;
  error: string | null;
  model: string | null;
  commitSha: string | null;
  analysisId: string | null;
  content: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: guide.id,
    status: guide.status as GuideStatus,
    step: guide.step,
    error: guide.error,
    model: guide.model,
    commitSha: guide.commitSha,
    analysisId: guide.analysisId,
    content: guide.content as OnboardingGuideContent | null,
    createdAt: guide.createdAt.toISOString(),
    updatedAt: guide.updatedAt.toISOString(),
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
  const guide = await prisma.onboardingGuide.findFirst({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });

  const outdated = Boolean(
    guide &&
      analysis &&
      guide.analysisId === analysis.id &&
      analysis.commitSha &&
      guide.commitSha !== analysis.commitSha
  );

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      repository: {
        owner: project.repository.owner,
        name: project.repository.name,
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
    guide: guide ? serializeGuide(guide) : null,
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

  if (!isAIConfigured()) {
    return NextResponse.json(
      { error: "AI documentation is not configured. Add NVIDIA_API_KEY to the server environment." },
      { status: 503 }
    );
  }

  const analysis = await prisma.analysis.findFirst({
    where: { projectId: id, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
  });
  if (!analysis?.summary) {
    return NextResponse.json(
      { error: "Analyze the repository first. An onboarding guide needs a completed analysis." },
      { status: 400 }
    );
  }

  const existing = await prisma.onboardingGuide.findFirst({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });

  // Reuse a finished guide for the same analysis — never regenerate pointlessly.
  if (existing && existing.status === "COMPLETED" && existing.analysisId === analysis.id) {
    return NextResponse.json({ guide: serializeGuide(existing), reused: true });
  }

  // An in-flight generation is already running for this analysis.
  if (existing && existing.status === "GENERATING" && existing.analysisId === analysis.id) {
    return NextResponse.json({ guide: serializeGuide(existing), reused: false, generating: true });
  }

  const provider = getProviderInfo();
  const guide = await prisma.onboardingGuide.create({
    data: {
      projectId: id,
      analysisId: analysis.id,
      commitSha: analysis.commitSha,
      model: provider.model,
      status: "GENERATING",
    },
  });

  startOnboardingGuide(id);

  return NextResponse.json({ guide: serializeGuide(guide), reused: false }, { status: 202 });
}