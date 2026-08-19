import Link from "next/link";
import { ArrowRight, CheckCircle2, FolderGit2, GitBranch, Hourglass, Plus, Sparkles } from "lucide-react";

import { AppShell } from "@/components/app-shell/app-shell";
import { ProjectCard } from "@/components/dashboard/project-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/ui-states/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { isActiveStatus } from "@/lib/analyzer";
import { getPrisma } from "@/lib/db";
import { getWorkspaceState, getUserProjects, type WorkspaceState } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();

  const prisma = getPrisma();
  let workspace: WorkspaceState;
  if (!prisma) {
    workspace = {
      configured: false,
      authenticated: true,
      installations: 0,
      installUrl: null,
      repositories: [],
      error: null,
    };
  } else {
    workspace = await getWorkspaceState(user.id);
  }

  const projects = await getUserProjects(user.id);
  const connectedCount = projects.length;
  const analyzedCount = projects.filter((p) => p.status === "COMPLETED").length;
  const inProgressCount = projects.filter((p) => isActiveStatus(p.status)).length;
  const firstName = user.name?.split(" ")[0] ?? user.login ?? "there";

  return (
    <AppShell title="Overview" user={user}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
              Welcome back, {firstName}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect a repository to download and analyze its codebase.
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link href="/repositories">
              <GitBranch className="h-4 w-4" />
              Analyze a repository
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Projects" value={connectedCount} icon={FolderGit2} hint="connected" />
          <StatCard
            label="Analyzed"
            value={analyzedCount}
            icon={CheckCircle2}
            hint="analysis complete"
          />
          <StatCard
            label="In progress"
            value={inProgressCount}
            icon={Hourglass}
            hint="analyzing now"
          />
          <StatCard
            label="Repositories"
            value={workspace.repositories.length}
            icon={GitBranch}
            hint="in your installation"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Projects</h3>
              <Link
                href="/repositories"
                className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
              >
                Connect more
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {projects.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FolderGit2}
                title="No projects yet"
                description="Connect a repository from your GitHub App installation to create your first project."
                actionLabel="Connect a repository"
                actionHref="/repositories"
              />
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">GitHub connection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                  </span>
                  <p className="text-sm">
                    {workspace.configured ? "Connected" : "Configuration required"}
                  </p>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {workspace.configured
                    ? `The RepoGuide GitHub App is installed on ${
                        workspace.installations
                      } account${workspace.installations === 1 ? "" : "s"} and can access ${
                        workspace.repositories.length
                      } repository${workspace.repositories.length === 1 ? "" : "s"}.`
                    : "Set DATABASE_URL and the GitHub App credentials to connect."}
                </p>
                {workspace.installUrl && (
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={workspace.installUrl} target="_blank" rel="noreferrer">
                      Manage installation
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-brand" />
                  Next up
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  RepoGuide downloads your repository and builds a real map of it —{" "}
                  <span className="font-medium text-foreground">languages, frameworks,
                  dependencies, entry points, and structure</span>. AI-powered codebase
                  chat is planned next.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild variant="outline" className="w-full justify-start gap-2">
                  <Link href="/repositories">
                    <Plus className="h-4 w-4" />
                    Analyze a repository
                  </Link>
                </Button>
                {workspace.installUrl && (
                  <Button asChild variant="outline" className="w-full justify-start gap-2">
                    <Link href={workspace.installUrl} target="_blank" rel="noreferrer">
                      <GitBranch className="h-4 w-4" />
                      Install GitHub App
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}