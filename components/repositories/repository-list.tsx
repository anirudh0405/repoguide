"use client";

import * as React from "react";
import { GitBranch, Search } from "lucide-react";

import { RepositoryCard } from "@/components/repositories/repository-card";
import { ComingSoon } from "@/components/coming-soon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui-states/empty-state";
import { mockRepositories } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const filters = [
  { key: "all", label: "All" },
  { key: "analyzed", label: "Analyzed" },
  { key: "analyzing", label: "In progress" },
] as const;

type FilterKey = (typeof filters)[number]["key"];

const analyzedRepos = new Set(["repo-1", "repo-2", "repo-3"]);
const analyzingRepos = new Set(["repo-4"]);
const projectRepos = new Set(["repo-1", "repo-2", "repo-3", "repo-4"]);

export function RepositoryList() {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<FilterKey>("all");

  const normalized = query.trim().toLowerCase();

  const results = mockRepositories.filter((repo) => {
    const matchesQuery =
      normalized.length === 0 ||
      repo.name.toLowerCase().includes(normalized) ||
      repo.owner.toLowerCase().includes(normalized) ||
      repo.language.toLowerCase().includes(normalized);

    if (!matchesQuery) return false;

    if (filter === "analyzed") return analyzedRepos.has(repo.id);
    if (filter === "analyzing") return analyzingRepos.has(repo.id);
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-muted text-brand">
            <GitBranch className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">GitHub integration</p>
            <p className="text-xs text-muted-foreground">
              Live authorization arrives in the next phase. These are sample repositories.
            </p>
          </div>
        </div>
        <Button variant="outline" disabled className="shrink-0">
          Connect GitHub
          <ComingSoon label="Phase 2" />
        </Button>
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
              key={repo.id}
              repository={repo}
              hasProject={projectRepos.has(repo.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title="No repositories found"
          description={`We couldn't find anything matching "${query}". Repositories from the connected GitHub org will appear here in the next phase.`}
        />
      )}
    </div>
  );
}