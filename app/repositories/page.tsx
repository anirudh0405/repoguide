import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { RepositoryList } from "@/components/repositories/repository-list";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { getWorkspaceState, getUserProjects, type WorkspaceState } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Repositories",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ installed?: string }>;
}

export default async function RepositoriesPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const { installed } = await searchParams;

  const prisma = getPrisma();
  let state: WorkspaceState;
  if (!prisma) {
    state = {
      configured: false,
      authenticated: true,
      installations: 0,
      installUrl: null,
      repositories: [],
      error: null,
    };
  } else {
    state = await getWorkspaceState(user.id);
  }

  const projects = await getUserProjects(user.id);
  const projectLinks = projects.map((project) => ({
    fullName: project.repository.fullName,
    projectId: project.id,
  }));

  return (
    <AppShell title="Repositories" user={user}>
      <div className="space-y-6">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
            Your repositories
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a repository to connect. Analysis is next on the roadmap.
          </p>
        </div>
        <RepositoryList
          repositories={state.repositories}
          projectLinks={projectLinks}
          installations={state.installations}
          installUrl={state.installUrl}
          configured={state.configured}
          error={state.error}
          installedJustNow={installed === "1"}
        />
      </div>
    </AppShell>
  );
}