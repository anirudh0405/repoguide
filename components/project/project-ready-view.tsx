import Link from "next/link";
import { CheckCircle2, ExternalLink, FolderGit2, GitBranch, Hourglass, Star } from "lucide-react";

import { StatusBadge } from "@/components/ui-states/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatRelativeTime } from "@/lib/utils";

export function ProjectReadyView({
  name,
  owner,
  description,
  language,
  visibility,
  stars,
  updatedAt,
  url,
  defaultBranch,
}: {
  name: string;
  owner: string;
  description: string | null;
  language: string | null;
  visibility: string;
  stars: number;
  updatedAt: string;
  url: string;
  defaultBranch: string;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="overflow-hidden">
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-success/15 text-success">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
              Repository connected
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              <span className="font-mono font-medium text-foreground">
                {owner}/{name}
              </span>{" "}
              is ready. RepoGuide will analyze this codebase in the next phase.
            </p>
            <div className="mt-4">
              <StatusBadge status="not_analyzed" />
            </div>
          </div>

          <Separator className="my-6" />

          <div className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-4">
              <span className="shrink-0 text-muted-foreground">Repository</span>
              <span className="inline-flex min-w-0 items-center gap-1.5 font-mono">
                <FolderGit2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {owner}/{name}
                </span>
                <Link
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Open repository on GitHub"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </span>
            </div>

            <div className="flex items-start justify-between gap-4">
              <span className="shrink-0 text-muted-foreground">Description</span>
              <span className="text-right text-foreground">
                {description ?? "No description provided."}
              </span>
            </div>

            <div className="flex items-start justify-between gap-4">
              <span className="shrink-0 text-muted-foreground">Language</span>
              <span className="text-foreground">{language ?? "Unknown"}</span>
            </div>

            <div className="flex items-start justify-between gap-4">
              <span className="shrink-0 text-muted-foreground">Visibility</span>
              <Badge
                variant={visibility === "private" ? "outline" : "secondary"}
                className="font-normal"
              >
                {visibility}
              </Badge>
            </div>

            <div className="flex items-start justify-between gap-4">
              <span className="shrink-0 text-muted-foreground">Stars</span>
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <Star className="h-3.5 w-3.5" />
                {stars}
              </span>
            </div>

            <div className="flex items-start justify-between gap-4">
              <span className="shrink-0 text-muted-foreground">Default branch</span>
              <span className="inline-flex items-center gap-1.5 font-mono text-foreground">
                <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                {defaultBranch}
              </span>
            </div>

            <div className="flex items-start justify-between gap-4">
              <span className="shrink-0 text-muted-foreground">Last updated</span>
              <span className="text-foreground">{formatRelativeTime(updatedAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button asChild className="gap-2">
          <Link href="/repositories">
            <FolderGit2 className="h-4 w-4" />
            Connect another repository
          </Link>
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
        <Button asChild variant="ghost" className="gap-2">
          <Link href={url} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
            Open on GitHub
          </Link>
        </Button>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <Hourglass className="h-3.5 w-3.5" />
        Analysis (architecture map, docs, and Q&A) is planned for Phase 3.
      </p>
    </div>
  );
}