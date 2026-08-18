import Link from "next/link";
import { ExternalLink, FolderGit2, Lock, Star, Unlock } from "lucide-react";

import { StatusBadge } from "@/components/ui-states/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";
import type { Project } from "@/lib/types";

const languageColors: Record<string, string> = {
  TypeScript: "text-blue-500 dark:text-blue-400",
  JavaScript: "text-yellow-600 dark:text-yellow-400",
  Java: "text-orange-500 dark:text-orange-400",
  Go: "text-cyan-500 dark:text-cyan-400",
  Python: "text-green-600 dark:text-green-400",
  Ruby: "text-red-500 dark:text-red-400",
  Rust: "text-orange-700 dark:text-orange-500",
};

export function ProjectCard({ project }: { project: Project }) {
  const color = languageColors[project.language ?? ""] ?? "text-muted-foreground";

  return (
    <Card className="overflow-hidden transition-colors hover:border-brand/40">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted/50">
              <FolderGit2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <Link
                href={`/projects/${project.id}`}
                className="block truncate font-mono text-sm font-semibold hover:text-brand"
              >
                <span className="text-muted-foreground">{project.repository.owner}/</span>
                {project.repository.name}
              </Link>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                {project.language && (
                  <>
                    <span className={color}>●</span>
                    <span>{project.language}</span>
                    <span>·</span>
                  </>
                )}
                <span className="inline-flex items-center gap-1">
                  {project.repository.visibility === "private" ? (
                    <Lock className="h-3 w-3" />
                  ) : (
                    <Unlock className="h-3 w-3" />
                  )}
                  {project.repository.visibility}
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {project.repository.stars}
                </span>
              </p>
            </div>
          </div>
          <StatusBadge status={project.status} />
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {project.description ?? "No description provided."}
        </p>

        <div className="mt-4 flex items-center justify-between border-t pt-3">
          <span className="text-xs text-muted-foreground">
            Connected {formatRelativeTime(project.createdAt)}
          </span>
          <Link
            href={project.repository.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Repository
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}