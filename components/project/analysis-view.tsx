"use client";

import * as React from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";
import type { AnalysisPhase, AnalysisSummary } from "@/lib/types";
import { AnalysisProgress } from "@/components/project/analysis-progress";
import { ProjectOverview } from "@/components/project/project-overview";

const ACTIVE_STATUSES = new Set<AnalysisPhase>([
  "QUEUED",
  "DOWNLOADING",
  "PARSING",
  "ANALYZING",
]);

function isActive(status: string | null): boolean {
  return status ? ACTIVE_STATUSES.has(status as AnalysisPhase) : false;
}

interface RepositoryData {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  visibility: string;
  stars: number;
  defaultBranch: string;
  url: string;
}

interface AnalysisData {
  status: AnalysisPhase;
  step: string | null;
  error: string | null;
  summary: AnalysisSummary | null;
  completedAt: string | null;
  createdAt: string;
}

interface ProjectData {
  id: string;
  status: AnalysisPhase;
  createdAt: string;
  repository: RepositoryData;
  analysis: AnalysisData | null;
  dependencies: { name: string; version: string | null; type: string; scope: string | null }[];
  sourceFileCount: number;
}

export function AnalysisView({ projectId, initial }: { projectId: string; initial: ProjectData }) {
  const [data, setData] = React.useState<ProjectData>(initial);
  const [retrying, setRetrying] = React.useState(false);

  const status = data.analysis?.status ?? data.status;
  const active = isActive(status);

  React.useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
        if (!response.ok) return;
        const next = (await response.json()) as ProjectData;
        if (!cancelled) setData(next);
      } catch {
        // Keep polling; transient failures are expected during analysis.
      }
    }, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [projectId, active]);

  const handleRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/analyze`, { method: "POST" });
      if (response.ok) {
        setData({
          ...data,
          status: "QUEUED",
          analysis: data.analysis ? { ...data.analysis, status: "QUEUED", error: null } : data.analysis,
        });
      }
    } finally {
      setRetrying(false);
    }
  };

  if (status === "FAILED") {
    return (
      <div className="mx-auto w-full max-w-xl">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl font-bold">
              Analysis failed
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {data.analysis?.error ?? "Something went wrong while analyzing this repository."}
            </p>
            <Button className="mt-6 gap-2" onClick={handleRetry} disabled={retrying}>
              {retrying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Retry analysis
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data.analysis?.status === "COMPLETED" && data.analysis.summary) {
    return (
      <ProjectOverview
        repository={data.repository}
        summary={data.analysis.summary}
        dependencies={data.dependencies}
        sourceFileCount={data.sourceFileCount}
        completedAt={
          data.analysis.completedAt ? formatRelativeTime(data.analysis.completedAt) : "recently"
        }
      />
    );
  }

  return <AnalysisProgress status={status} step={data.analysis?.step ?? null} />;
}