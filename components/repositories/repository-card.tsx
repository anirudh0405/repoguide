"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, GitFork, Lock, Loader2, Play, Star, Unlock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCompactNumber, formatRelativeTime } from "@/lib/utils";
import type { WorkspaceRepo } from "@/lib/workspace";

const languageColors: Record<string, { dot: string; badge: string }> = {
  TypeScript: { dot: "bg-blue-500", badge: "text-blue-600 dark:text-blue-400" },
  JavaScript: { dot: "bg-yellow-500", badge: "text-yellow-600 dark:text-yellow-400" },
  Python: { dot: "bg-green-600", badge: "text-green-600 dark:text-green-400" },
  Java: { dot: "bg-orange-500", badge: "text-orange-600 dark:text-orange-400" },
  Go: { dot: "bg-cyan-500", badge: "text-cyan-600 dark:text-cyan-400" },
  Rust: { dot: "bg-orange-700", badge: "text-orange-700 dark:text-orange-500" },
  Ruby: { dot: "bg-red-600", badge: "text-red-600 dark:text-red-400" },
  PHP: { dot: "bg-indigo-500", badge: "text-indigo-600 dark:text-indigo-400" },
  "C#": { dot: "bg-green-700", badge: "text-green-700 dark:text-green-400" },
  "C++": { dot: "bg-blue-700", badge: "text-blue-700 dark:text-blue-400" },
  C: { dot: "bg-slate-500", badge: "text-slate-600 dark:text-slate-400" },
  Swift: { dot: "bg-orange-600", badge: "text-orange-600 dark:text-orange-400" },
  Kotlin: { dot: "bg-purple-600", badge: "text-purple-600 dark:text-purple-400" },
  Dart: { dot: "bg-sky-500", badge: "text-sky-600 dark:text-sky-400" },
  HTML: { dot: "bg-orange-500", badge: "text-orange-600 dark:text-orange-400" },
  CSS: { dot: "bg-sky-500", badge: "text-sky-600 dark:text-sky-400" },
  Shell: { dot: "bg-emerald-600", badge: "text-emerald-600 dark:text-emerald-400" },
  HCL: { dot: "bg-purple-500", badge: "text-purple-600 dark:text-purple-400" },
};

export function RepositoryCard({
  repository,
  hasProject = false,
  projectId,
}: {
  repository: WorkspaceRepo;
  hasProject?: boolean;
  projectId?: string;
}) {
  const router = useRouter();
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const colors = languageColors[repository.language ?? ""] ?? {
    dot: "bg-muted-foreground",
    badge: "",
  };

  const handleAnalyze = async () => {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryId: Number(repository.id) }),
      });
      const data = (await response.json()) as { projectId?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to start analysis");
      }
      router.push(`/projects/${data.projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect repository");
      setCreating(false);
    }
  };

  return (
    <Card className="flex h-full flex-col transition-colors hover:border-brand/40">
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors.dot}`} />
              <p className="truncate font-mono text-sm font-semibold">
                <span className="text-muted-foreground">{repository.owner}/</span>
                <Link
                  href={repository.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-1 truncate hover:text-brand"
                >
                  <span className="truncate">{repository.name}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                </Link>
              </p>
            </div>
          </div>
          <Badge
            variant={repository.visibility === "private" ? "outline" : "secondary"}
            className="shrink-0 gap-1 font-normal"
          >
            {repository.visibility === "private" ? (
              <Lock className="h-3 w-3" />
            ) : (
              <Unlock className="h-3 w-3" />
            )}
            {repository.visibility}
          </Badge>
        </div>

        <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
          {repository.description ?? "No description provided."}
        </p>

        <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
          {repository.language && <span className={`font-medium ${colors.badge}`}>{repository.language}</span>}
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5" />
            {formatCompactNumber(repository.stars)}
          </span>
          <span className="inline-flex items-center gap-1">
            <GitFork className="h-3.5 w-3.5" />
            {formatCompactNumber(repository.forks)}
          </span>
          <span>Updated {formatRelativeTime(repository.updatedAt)}</span>
        </div>

        <div className="mt-5 flex flex-col gap-2 border-t pt-4">
          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="brand"
              className="flex-1 gap-1.5"
              onClick={handleAnalyze}
              disabled={creating}
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {creating ? "Queuing…" : "Analyze"}
            </Button>
            {hasProject && projectId && (
              <Button asChild size="sm" variant="outline" className="flex-1">
                <Link href={`/projects/${projectId}`}>View project</Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}