import Link from "next/link";
import { FolderGit2 } from "lucide-react";
import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { ProjectReadyView } from "@/components/project/project-ready-view";
import { EmptyState } from "@/components/ui-states/empty-state";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";

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
  if (prisma) {
    try {
      // Projects are always scoped to the signed-in user. An ID belonging to
      // another user simply doesn't resolve — this prevents cross-user access.
      project = await prisma.project.findFirst({
        where: { id, userId: user.id },
        include: { repository: true },
      });
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

  if (project.status === "NOT_ANALYZED") {
    return (
      <AppShell title={project.repository.name} user={user}>
        <ProjectReadyView
          name={project.name}
          owner={project.repository.owner}
          description={project.description}
          language={project.repository.language}
          visibility={project.repository.visibility}
          stars={project.repository.stars}
          updatedAt={project.repository.updatedAt.toISOString()}
          url={project.repository.url}
          defaultBranch={project.repository.defaultBranch}
        />
      </AppShell>
    );
  }

  return (
    <AppShell title={project.repository.name} user={user}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            Back to dashboard
          </Link>
        </div>
        <EmptyState
          icon={FolderGit2}
          title={`${project.repository.name} is not analyzed yet`}
          description="Code analysis — architecture maps, documentation, and Q&A — arrives in Phase 3."
          actionLabel="Back to repositories"
          actionHref="/repositories"
        />
      </div>
    </AppShell>
  );
}