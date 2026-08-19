import type { Metadata } from "next";
import Link from "next/link";
import { FileText, FolderGit2, Sparkles } from "lucide-react";

import { AppShell } from "@/components/app-shell/app-shell";
import { DocumentationView } from "@/components/project/documentation-view";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import type { OnboardingGuideContent as GuideContent } from "@/lib/ai/onboarding-schema";

export const metadata: Metadata = {
  title: "Onboarding Guide",
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentationPage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;

  const prisma = getPrisma();
  let project = null;
  let analysis = null;
  let guide = null;
  if (prisma) {
    try {
      project = await prisma.project.findFirst({
        where: { id, userId: user.id },
        include: { repository: true },
      });
      if (project) {
        [analysis, guide] = await Promise.all([
          prisma.analysis.findFirst({
            where: { projectId: id, status: "COMPLETED" },
            orderBy: { completedAt: "desc" },
          }),
          prisma.onboardingGuide.findFirst({
            where: { projectId: id },
            orderBy: { createdAt: "desc" },
          }),
        ]);
      }
    } catch {
      project = null;
    }
  }

  if (!project) {
    return (
      <AppShell title="Project not found" user={user}>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted/50">
            <FolderGit2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
              Project not found
            </h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              This project doesn&apos;t exist or belongs to another account.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  if (!analysis?.summary) {
    return (
      <AppShell title="Onboarding Guide" user={user}>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted/50">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
              Analyze this repository first
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              An onboarding guide is built from the repository analysis. Run the analysis on the
              project page, then come back here.
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link href={`/projects/${id}`}>
              <Sparkles className="h-4 w-4" />
              Go to project analysis
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const initial = {
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
    analysis: {
      id: analysis.id,
      status: analysis.status,
      commitSha: analysis.commitSha,
      completedAt: analysis.completedAt?.toISOString() ?? null,
    },
    guide: guide
      ? {
          id: guide.id,
          status: guide.status as "GENERATING" | "COMPLETED" | "FAILED",
          step: guide.step,
          error: guide.error,
          model: guide.model,
          commitSha: guide.commitSha,
          analysisId: guide.analysisId,
          content: guide.content as unknown as GuideContent,
          createdAt: guide.createdAt.toISOString(),
          updatedAt: guide.updatedAt.toISOString(),
        }
      : null,
    outdated:
      Boolean(
        guide &&
          analysis.commitSha &&
          guide.analysisId === analysis.id &&
          guide.commitSha !== analysis.commitSha
      ),
  };

  return (
    <AppShell title={`${project.repository.name} · Guide`} user={user}>
      <DocumentationView projectId={project.id} initial={initial} />
    </AppShell>
  );
}