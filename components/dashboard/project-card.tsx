import Link from "next/link";
import { FileCode2, FolderGit2 } from "lucide-react";

import { StatusBadge } from "@/components/ui-states/status-badge";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";
import type { Project } from "@/lib/types";

const languageColors: Record<string, string> = {
  TypeScript: "text-blue-500 dark:text-blue-400",
  Java: "text-orange-500 dark:text-orange-400",
  Go: "text-cyan-500 dark:text-cyan-400",
  Python: "text-green-600 dark:text-green-400",
};

export function ProjectCard({ project }: { project: Project }) {
  const color = languageColors[project.language] ?? "text-muted-foreground";

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
                {project.name}
              </Link>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={color}>●</span>
                {project.language}
                <span>·</span>
                <span className="flex items-center gap-1">
                  <FileCode2 className="h-3 w-3" />
                  {project.stats.files} files
                </span>
              </p>
            </div>
          </div>
          <StatusBadge status={project.status} />
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>

        {project.status === "analyzing" && project.progress !== undefined ? (
          <div className="mt-4">
            <Progress value={project.progress} />
            <p className="mt-1.5 flex justify-between text-xs text-muted-foreground">
              <span>Indexing files…</span>
              <span>{project.progress}%</span>
            </p>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex flex-wrap gap-1.5">
              {project.techStack.slice(0, 3).map((tech) => (
                <Badge key={tech} variant="secondary" className="font-normal">
                  {tech}
                </Badge>
              ))}
            </div>
            {project.analyzedAt && (
              <span className="shrink-0 text-xs text-muted-foreground">
                Analyzed {formatRelativeTime(project.analyzedAt)}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}