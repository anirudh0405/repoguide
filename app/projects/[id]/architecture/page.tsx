import type { Metadata } from "next";
import Link from "next/link";
import { FolderGit2, Network, Sparkles } from "lucide-react";

import { AppShell } from "@/components/app-shell/app-shell";
import { ArchitectureView } from "@/components/project/architecture-view";
import { Button } from "@/components/ui/button";
import type { ArchitectureModel } from "@/lib/architecture/types";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Architecture",
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ArchitecturePage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;

  const prisma = getPrisma();
  let project = null;
  let analysis = null;
  let graph = null;
  if (prisma) {
    try {
      project = await prisma.project.findFirst({
        where: { id, userId: user.id },
        include: { repository: true },
      });
      if (project) {
        [analysis, graph] = await Promise.all([
          prisma.analysis.findFirst({
            where: { projectId: id, status: "COMPLETED" },
            orderBy: { completedAt: "desc" },
          }),
          prisma.architectureGraph.findFirst({
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
      <AppShell title="Architecture" user={user}>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted/50">
            <Network className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
              Analyze this repository first
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              The architecture graph is built from the repository analysis. Run the analysis on
              the project page, then come back here.
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
      repository: {
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
    graph: graph
      ? {
          id: graph.id,
          status: graph.status as "GENERATING" | "COMPLETED" | "FAILED",
          step: graph.step,
          error: graph.error,
          commitSha: graph.commitSha,
          analysisId: graph.analysisId,
          content: graph.content as unknown as ArchitectureModel,
          createdAt: graph.createdAt.toISOString(),
          updatedAt: graph.updatedAt.toISOString(),
        }
      : null,
    outdated: Boolean(
      graph &&
        analysis.commitSha &&
        graph.analysisId === analysis.id &&
        graph.commitSha !== analysis.commitSha
    ),
  };

  return (
    <AppShell title={`${project.repository.name} · Architecture`} user={user}>
      <ArchitectureView projectId={project.id} initial={initial} />
    </AppShell>
  );
}
