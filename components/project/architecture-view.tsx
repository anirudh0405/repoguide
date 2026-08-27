"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileCode2,
  GitBranch,
  Loader2,
  Network,
  RefreshCw,
} from "lucide-react";

import { ArchitectureGraphExplorer } from "@/components/project/architecture-graph";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ArchitectureModel, ArchitectureStatus } from "@/lib/architecture/types";

interface GraphData {
  id: string;
  status: ArchitectureStatus;
  step: string | null;
  error: string | null;
  commitSha: string | null;
  analysisId: string | null;
  content: ArchitectureModel | null;
  createdAt: string;
  updatedAt: string;
}

interface ArchResponse {
  project: {
    id: string;
    name: string;
    repository: { fullName: string; defaultBranch: string };
  };
  analysis: { id: string; status: string; commitSha: string | null; completedAt: string | null } | null;
  graph: GraphData | null;
  outdated: boolean;
}

const STAGES: { step: string | null; label: string; terminal: ArchitectureStatus | null }[] = [
  { step: "analysis-loaded", label: "Repository analysis loaded", terminal: null },
  { step: "downloading", label: "Downloading analyzed code", terminal: null },
  { step: "scanning", label: "Scanning files and imports", terminal: null },
  { step: "mapping", label: "Detecting components and connections", terminal: null },
  { step: "building", label: "Building the architecture graph", terminal: "COMPLETED" },
];

function progressIndex(status: ArchitectureStatus, step: string | null): number {
  if (status === "COMPLETED") return STAGES.length;
  if (status === "FAILED") return -1;
  const index = STAGES.findIndex((stage) => stage.step === step);
  return index >= 0 ? index + 1 : 0;
}

function SummaryStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-[family-name:var(--font-display)] text-2xl font-bold leading-none">
        {value}
      </span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export function ArchitectureView({
  projectId,
  initial,
}: {
  projectId: string;
  initial: ArchResponse;
}) {
  const [data, setData] = React.useState<ArchResponse>(initial);
  const [starting, setStarting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const graph = data.graph;
  const generating = graph?.status === "GENERATING";
  const failed = graph?.status === "FAILED";
  const completed = graph?.status === "COMPLETED" && graph.content;

  const fetchGraph = React.useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}/architecture`, { cache: "no-store" });
    if (response.ok) {
      const next = (await response.json()) as ArchResponse;
      setData(next);
    }
  }, [projectId]);

  // Poll while a build is in flight.
  React.useEffect(() => {
    if (!generating) return;
    const timer = window.setInterval(() => {
      void fetchGraph();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [generating, fetchGraph]);

  const handleGenerate = async () => {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/architecture`, { method: "POST" });
      const body = (await response.json()) as ArchResponse & { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Could not start building the architecture graph.");
        return;
      }
      await fetchGraph();
    } catch {
      setError("Could not start building the architecture graph.");
    } finally {
      setStarting(false);
    }
  };

  if (completed && graph?.content) {
    const model = graph.content;
    return (
      <div className="space-y-6">
        {/* Header + architecture summary */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
                  <Network className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
                    Architecture
                  </h2>
                  <p className="mt-0.5 max-w-xl text-sm text-muted-foreground">
                    How this system is put together — mapped from real imports, routes,
                    packages, and configuration.
                  </p>
                </div>
              </div>
              {data.outdated && (
                <Button onClick={handleGenerate} disabled={starting} variant="brand" className="gap-2">
                  {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Rebuild for new code
                </Button>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-5 sm:grid-cols-4">
              <SummaryStat value={model.summary.majorComponents} label="major components" />
              <SummaryStat value={model.summary.importantFiles} label="important files" />
              <SummaryStat value={model.summary.externalServices} label="external services" />
              <SummaryStat value={model.summary.databases} label="databases" />
            </div>

            {model.notes.length > 0 && (
              <ul className="mt-4 space-y-1 border-t pt-4">
                {model.notes.map((note) => (
                  <li key={note} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <span aria-hidden>·</span>
                    {note}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <ArchitectureGraphExplorer projectId={projectId} model={model} />
      </div>
    );
  }

  if (generating) {
    const progress = progressIndex("GENERATING", graph?.step ?? null);
    return (
      <div className="mx-auto w-full max-w-xl">
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-brand" />
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
                Mapping the architecture
              </h2>
            </div>
            <ol className="mt-6 space-y-3">
              {STAGES.map((stage, index) => {
                const done = index < progress;
                const active = index === progress;
                return (
                  <li key={stage.label} className="flex items-center gap-3 text-sm">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    ) : active ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand" />
                    ) : (
                      <span className="h-4 w-4 shrink-0 rounded-full border border-muted-foreground/30" />
                    )}
                    <span
                      className={
                        done
                          ? "text-foreground/80"
                          : active
                            ? "font-medium text-foreground"
                            : "text-muted-foreground"
                      }
                    >
                      {stage.label}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="mt-6 text-xs text-muted-foreground">
              The analyzed code is scanned statically — no AI is involved, so this is quick.
              This page updates automatically.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (failed && graph) {
    return (
      <div className="mx-auto w-full max-w-xl">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl font-bold">
              Could not map the architecture
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {graph.error ?? "Something went wrong while building the architecture graph."}
            </p>
            <Button className="mt-6 gap-2" onClick={handleGenerate} disabled={starting}>
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <Card>
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-brand-muted text-brand">
            <Network className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl font-bold">
            No architecture graph yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            RepoGuide scans the analyzed code for components — frontend, API, authentication,
            databases, workers, external services — and maps how they connect. Every connection
            is backed by real evidence from the repository.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <FileCode2 className="h-3.5 w-3.5" /> Imports & routes
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" /> Databases & queues
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5" /> Confidence-rated connections
            </span>
          </div>
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
          <Button className="mt-6 gap-2" onClick={handleGenerate} disabled={starting}>
            {starting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Network className="h-4 w-4" />
            )}
            Build architecture graph
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
