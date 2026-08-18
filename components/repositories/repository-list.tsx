"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, GitBranch, RefreshCw, Search } from "lucide-react";

import { RepositoryCard } from "@/components/repositories/repository-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui-states/empty-state";
import { cn } from "@/lib/utils";
import type { WorkspaceRepo } from "@/lib/workspace";

const filters = [
  { key: "all", label: "All" },
  { key: "connected", label: "Connected" },
] as const;

type FilterKey = (typeof filters)[number]["key"];

interface RepositoryListProps {
  repositories: WorkspaceRepo[];
  projectLinks: { fullName: string; projectId: string }[];
  installations: number;
  installUrl: string | null;
  configured: boolean;
  error: string | null;
  installedJustNow: boolean;
}

export function RepositoryList({
  repositories,
  projectLinks,
  installations,
  installUrl,
  configured,
  error,
  installedJustNow,
}: RepositoryListProps) {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<FilterKey>("all");

  const projectByFullName = new Map(projectLinks.map((link) => [link.fullName, link.projectId]));
  const normalized = query.trim().toLowerCase();

  const results = repositories.filter((repo) => {
    const matchesQuery =
      normalized.length === 0 ||
      repo.name.toLowerCase().includes(normalized) ||
      repo.owner.toLowerCase().includes(normalized) ||
      (repo.language ?? "").toLowerCase().includes(normalized);

    if (!matchesQuery) return false;

    if (filter === "connected") return projectByFullName.has(repo.fullName);
    return true;
  });

  if (!configured) {
    return (
      <EmptyState
        icon={GitBranch}
        title="Database not configured"
        description="Set DATABASE_URL to your PostgreSQL database to connect your GitHub App. See .env.example for setup."
      />
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load repositories"
        description={`${error} Reconnect your GitHub account or try again.`}
        actionLabel="Try again"
        onAction={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "flex flex-col gap-4 rounded-lg border p-5 sm:flex-row sm:items-center sm:justify-between",
          installedJustNow ? "border-success/40 bg-success/10" : "border bg-muted/30"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
              installedJustNow ? "bg-success/15 text-success" : "bg-brand-muted text-brand"
            )}
          >
            {installedJustNow ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <GitBranch className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold">
              {installedJustNow ? "GitHub App installed" : "GitHub App connected"}
            </p>
            <p className="text-xs text-muted-foreground">
              {repositories.length === 0
                ? "Repositories from your GitHub App installation will appear here."
                : `Showing ${repositories.length} repository${
                    repositories.length === 1 ? "" : "s"
                  } your installation can access.`}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {installUrl && installations === 0 && (
            <Button asChild variant="brand" size="sm" className="gap-1.5">
              <Link href={installUrl} target="_blank" rel="noreferrer">
                <GitBranch className="h-3.5 w-3.5" />
                Install on GitHub
              </Link>
            </Button>
          )}
          {installUrl && installations > 0 && (
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href={installUrl} target="_blank" rel="noreferrer">
                <RefreshCw className="h-3.5 w-3.5" />
                Manage installation
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search repositories, owners, or languages…"
            className="pl-9"
            aria-label="Search repositories"
          />
        </div>
        <div className="flex items-center gap-1 rounded-md bg-muted p-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-sm px-3 py-1.5 text-sm transition-colors",
                filter === f.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {results.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((repo) => (
            <RepositoryCard
              key={repo.fullName}
              repository={repo}
              hasProject={projectByFullName.has(repo.fullName)}
              projectId={projectByFullName.get(repo.fullName)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title={repositories.length === 0 ? "No repositories available" : "No repositories found"}
          description={
            repositories.length === 0
              ? installUrl
                ? "Install the RepoGuide GitHub App to grant access to your repositories."
                : "Once your GitHub App installation grants repository access, repositories will appear here."
              : `We couldn't find anything matching "${query}".`
          }
          actionLabel={repositories.length === 0 && installUrl ? "Install on GitHub" : undefined}
          onAction={
            repositories.length === 0 && installUrl
              ? () => window.open(installUrl, "_blank", "noopener,noreferrer")
              : undefined
          }
        />
      )}
    </div>
  );
}