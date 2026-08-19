import type { Metadata } from "next";
import Link from "next/link";
import { FolderGit2 } from "lucide-react";

import { AppShell } from "@/components/app-shell/app-shell";
import { AnalysisView } from "@/components/project/analysis-view";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import type { AnalysisPhase, AnalysisSummary } from "@/lib/types";

export const metadata: Metadata = {
  title: "Project",
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;

  const prisma = getPrisma();

  let project = null;
  let analysis = null;
  let dependencies: { id: string; name: string; version: string | null; type: string; scope: string | null }[] = [];
  let sourceFileCount = 0;
  if (prisma) {
    try {
      // Projects are always scoped to the signed-in user. An ID belonging to
      // another user simply doesn't resolve — this prevents cross-user access.
      project = await prisma.project.findFirst({
        where: { id, userId: user.id },
        include: { repository: true },
      });
      if (project) {
        [analysis, dependencies, sourceFileCount] = await Promise.all([
          prisma.analysis.findFirst({ where: { projectId: id }, orderBy: { createdAt: "desc" } }),
          prisma.dependency.findMany({
            where: { projectId: id },
            orderBy: [{ type: "asc" }, { name: "asc" }],
          }),
          prisma.sourceFile.count({ where: { projectId: id } }),
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
              We couldn&apos;t find a project for this id. It may belong to another account, or the
              repository wasn&apos;t connected.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
            <Button asChild>
              <Link href="/repositories">Browse repositories</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const initial = {
    id: project.id,
    status: project.status as AnalysisPhase,
    createdAt: project.createdAt.toISOString(),
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
          status: analysis.status as AnalysisPhase,
          step: analysis.step,
          error: analysis.error,
          summary: analysis.summary as AnalysisSummary | null,
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
  };

  return (
    <AppShell title={project.repository.name} user={user}>
      <AnalysisView projectId={project.id} initial={initial} />
    </AppShell>
  );
}