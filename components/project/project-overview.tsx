"use client";

import { ExternalLink, GitBranch, Lock, Star, Unlock } from "lucide-react";

import { DocumentationPanel } from "@/components/project/documentation-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui-states/status-badge";
import { formatCompactNumber } from "@/lib/utils";
import type { AnalysisSummary, Confidence, EntryPointInfo } from "@/lib/types";

interface ProjectOverviewProps {
  projectId: string;
  repository: {
    owner: string;
    name: string;
    fullName: string;
    description: string | null;
    language: string | null;
    visibility: string;
    stars: number;
    defaultBranch: string;
    url: string;
  };
  summary: AnalysisSummary;
  dependencies: { name: string; version: string | null; type: string; scope: string | null }[];
  sourceFileCount: number;
  completedAt: string;
}

function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const variant =
    confidence === "HIGH"
      ? "success"
      : confidence === "MEDIUM"
        ? "warning"
        : "secondary";
  return <Badge variant={variant}>{confidence}</Badge>;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="font-[family-name:var(--font-display)] text-2xl font-bold leading-none">
          {typeof value === "number" ? formatCompactNumber(value) : value}
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

export function ProjectOverview({
  projectId,
  repository,
  summary,
  dependencies,
  sourceFileCount,
  completedAt,
}: ProjectOverviewProps) {
  const languageEntries = Object.entries(summary.languages).sort(
    (a, b) => b[1].lines - a[1].lines
  );
  const maxLanguageLines = Math.max(1, ...languageEntries.map(([, stats]) => stats.lines));

  const depsByType = new Map<string, typeof dependencies>();
  for (const dep of dependencies) {
    const list = depsByType.get(dep.type) ?? [];
    list.push(dep);
    depsByType.set(dep.type, list);
  }
  const depGroups = Array.from(depsByType.entries());
  const DEPENDENCIES_PER_TYPE = 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h2 className="truncate font-[family-name:var(--font-display)] text-xl font-bold tracking-tight sm:text-2xl">
                  <span className="text-muted-foreground">{repository.owner}/</span>
                  {repository.name}
                </h2>
                <StatusBadge status="COMPLETED" />
              </div>
              <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
                {repository.description ?? "No description provided."}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {repository.language && <span className="font-medium text-foreground">{repository.language}</span>}
                <span className="inline-flex items-center gap-1">
                  {repository.visibility === "private" ? (
                    <Lock className="h-3 w-3" />
                  ) : (
                    <Unlock className="h-3 w-3" />
                  )}
                  {repository.visibility}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {formatCompactNumber(repository.stars)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  {summary.defaultBranch}
                </span>
                <span className="text-xs text-muted-foreground/70">
                  Analyzed {completedAt}
                </span>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a href={repository.url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Open on GitHub
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <DocumentationPanel projectId={projectId} />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Source files" value={sourceFileCount} />
        <Stat label="Lines of code" value={summary.lineCount} />
        <Stat label="Languages" value={languageEntries.length} />
        <Stat label="Dependencies" value={dependencies.length} />
      </div>

      {/* Languages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Languages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {languageEntries.length === 0 ? (
            <EmptyNote text="No languages detected." />
          ) : (
            languageEntries.map(([language, stats]) => (
              <div key={language}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{language}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatCompactNumber(stats.files)} files · {formatCompactNumber(stats.lines)} lines
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${Math.max(3, (stats.lines / maxLanguageLines) * 100)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Frameworks & package managers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Frameworks</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.frameworks.length === 0 ? (
              <EmptyNote text="No well-known frameworks detected." />
            ) : (
              <div className="flex flex-wrap gap-2">
                {summary.frameworks.map((framework) => (
                  <Badge key={framework} variant="brand" className="font-normal">
                    {framework}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Package managers</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.packageManagers.length === 0 ? (
              <EmptyNote text="No package managers detected." />
            ) : (
              <div className="flex flex-wrap gap-2">
                {summary.packageManagers.map((manager) => (
                  <Badge key={manager} variant="outline" className="font-normal">
                    {manager}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Entry points */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Entry points</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.entryPoints.length === 0 ? (
            <EmptyNote text="No confident entry points detected." />
          ) : (
            <div className="space-y-2">
              {summary.entryPoints.map((entry: EntryPointInfo) => (
                <div
                  key={entry.path}
                  className="flex flex-col gap-1.5 rounded-md border bg-muted/30 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm">{entry.path}</p>
                    {entry.note && (
                      <p className="truncate text-xs text-muted-foreground">{entry.note}</p>
                    )}
                  </div>
                  <ConfidenceBadge confidence={entry.confidence} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Important files */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Important files</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.importantFiles.length === 0 ? (
            <EmptyNote text="No important files detected." />
          ) : (
            <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
              {summary.importantFiles.map((file) => (
                <div key={file.path} className="flex min-w-0 items-baseline gap-2 text-sm">
                  <span className="truncate font-mono">{file.path}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">· {file.kind}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Directory tree */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Directory structure</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-96 overflow-auto rounded-md border bg-muted/30 p-4 font-mono text-xs leading-relaxed text-foreground">
            {summary.directoryTree}
          </pre>
        </CardContent>
      </Card>

      {/* Dependencies */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Dependencies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {depGroups.length === 0 ? (
            <EmptyNote text="No dependencies detected." />
          ) : (
            depGroups.map(([type, deps]) => (
              <div key={type}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {type} · {deps.length}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {deps.slice(0, DEPENDENCIES_PER_TYPE).map((dep) => (
                    <span
                      key={`${type}-${dep.name}`}
                      className="inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-2.5 py-1 font-mono text-xs"
                    >
                      {dep.name}
                      {dep.version && <span className="text-muted-foreground">@{dep.version}</span>}
                      {dep.scope === "dev" && (
                        <span className="text-[10px] uppercase text-muted-foreground">dev</span>
                      )}
                    </span>
                  ))}
                </div>
                {deps.length > DEPENDENCIES_PER_TYPE && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    … and {deps.length - DEPENDENCIES_PER_TYPE} more {type} dependencies.
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button asChild variant="outline" className="gap-2">
          <a href="/dashboard">Back to dashboard</a>
        </Button>
        <Button asChild variant="ghost" className="gap-2">
          <a href="/repositories">Browse repositories</a>
        </Button>
      </div>
    </div>
  );
}