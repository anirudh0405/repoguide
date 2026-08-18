"use client";

import * as React from "react";
import Link from "next/link";
import { GitFork, Lock, Play, Star, Unlock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCompactNumber, formatRelativeTime } from "@/lib/utils";
import type { Repository } from "@/lib/types";

const languageColors: Record<string, { dot: string; badge: string }> = {
  TypeScript: { dot: "bg-blue-500", badge: "text-blue-600 dark:text-blue-400" },
  JavaScript: { dot: "bg-yellow-500", badge: "text-yellow-600 dark:text-yellow-400" },
  Python: { dot: "bg-green-600", badge: "text-green-600 dark:text-green-400" },
  Java: { dot: "bg-orange-500", badge: "text-orange-600 dark:text-orange-400" },
  Go: { dot: "bg-cyan-500", badge: "text-cyan-600 dark:text-cyan-400" },
  Rust: { dot: "bg-orange-700", badge: "text-orange-700 dark:text-orange-500" },
  HCL: { dot: "bg-purple-500", badge: "text-purple-600 dark:text-purple-400" },
};

export function RepositoryCard({
  repository,
  hasProject = false,
}: {
  repository: Repository;
  hasProject?: boolean;
}) {
  const [analyzeOpen, setAnalyzeOpen] = React.useState(false);
  const colors = languageColors[repository.language] ?? { dot: "bg-muted-foreground", badge: "" };

  return (
    <>
      <Card className="flex h-full flex-col transition-colors hover:border-brand/40">
        <CardContent className="flex flex-1 flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors.dot}`} />
                <p className="truncate font-mono text-sm font-semibold">
                  <span className="text-muted-foreground">{repository.owner}/</span>
                  {repository.name}
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
            {repository.description}
          </p>

          <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className={`font-medium ${colors.badge}`}>{repository.language}</span>
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

          <div className="mt-5 flex gap-2 border-t pt-4">
            <Button
              size="sm"
              variant="brand"
              className="flex-1 gap-1.5"
              onClick={() => setAnalyzeOpen(true)}
            >
              <Play className="h-3.5 w-3.5" />
              Analyze
            </Button>
            {hasProject && (
              <Button asChild size="sm" variant="outline" className="flex-1">
                <Link href={`/projects/${repository.name}`}>View project</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={analyzeOpen} onOpenChange={setAnalyzeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Analyze {repository.name}</DialogTitle>
            <DialogDescription>
              GitHub authorization and real analysis are coming in the next phase. You can preview
              a sample analysis for this repository today using mock data.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/40 p-3 font-mono text-xs">
            <p className="text-muted-foreground">$ repoguide analyze {repository.owner}/{repository.name}</p>
            <p className="mt-1 text-brand">→ Queueing analysis for {repository.defaultBranch}…</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnalyzeOpen(false)}>
              Not now
            </Button>
            <Button asChild onClick={() => setAnalyzeOpen(false)}>
              <Link href={`/projects/${hasProject ? repository.name : "ecommerce-platform"}`}>
                View sample analysis
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}