"use client";

import * as React from "react";
import { AlertTriangle, Loader2, Network, RefreshCw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type GraphStatus = "GENERATING" | "COMPLETED" | "FAILED";

interface GraphSummary {
  id: string;
  status: GraphStatus;
  error: string | null;
}

interface ArchResponse {
  graph: GraphSummary | null;
  outdated: boolean;
}

export function ArchitecturePanel({ projectId }: { projectId: string }) {
  const [state, setState] = React.useState<{
    loading: boolean;
    graph: GraphSummary | null;
    outdated: boolean;
    error: string | null;
  }>({ loading: true, graph: null, outdated: false, error: null });
  const [acting, setActing] = React.useState(false);

  const refresh = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/architecture`, { cache: "no-store" });
      if (!response.ok) return;
      const body = (await response.json()) as ArchResponse;
      setState((prev) => ({ ...prev, graph: body.graph, outdated: body.outdated, loading: false }));
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [projectId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const generating = state.graph?.status === "GENERATING";
  React.useEffect(() => {
    if (!generating) return;
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(timer);
  }, [generating, refresh]);

  const handleGenerate = async () => {
    if (acting) return;
    setActing(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/architecture`, { method: "POST" });
      const body = (await response.json()) as ArchResponse & { error?: string };
      if (!response.ok) {
        setState((prev) => ({ ...prev, error: body.error ?? "Could not start building." }));
      } else {
        setState((prev) => ({ ...prev, error: null }));
        await refresh();
      }
    } catch {
      setState((prev) => ({ ...prev, error: "Could not start building." }));
    } finally {
      setActing(false);
    }
  };

  const graph = state.graph;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                graph?.status === "COMPLETED"
                  ? "bg-brand-muted text-brand"
                  : graph?.status === "FAILED"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {graph?.status === "COMPLETED" ? (
                <Network className="h-5 w-5" />
              ) : graph?.status === "FAILED" ? (
                <AlertTriangle className="h-5 w-5" />
              ) : generating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Network className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-[family-name:var(--font-display)] text-base font-bold">
                Architecture graph
              </h3>
              <p className="mt-0.5 max-w-lg text-sm text-muted-foreground">
                {state.loading
                  ? "Checking…"
                  : graph?.status === "COMPLETED"
                    ? "An interactive map of this system's components and connections."
                    : graph?.status === "GENERATING"
                      ? "Mapping components and connections — you can watch progress."
                      : graph?.status === "FAILED"
                        ? "The last build attempt failed."
                        : "An interactive map of how this system is put together, built from real imports and routes."}
              </p>
              {state.outdated && (
                <p className="mt-1 text-xs font-medium text-warning">
                  The repository changed since this graph was built.
                </p>
              )}
              {state.error && <p className="mt-1 text-xs text-destructive">{state.error}</p>}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {(graph?.status === "COMPLETED" || graph?.status === "GENERATING") && (
              <Button asChild variant="outline" className="gap-2">
                <Link href={`/projects/${projectId}/architecture`}>
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Watch progress
                    </>
                  ) : (
                    <>
                      <Network className="h-4 w-4" />
                      View graph
                    </>
                  )}
                </Link>
              </Button>
            )}
            {!generating && !state.loading && (
              <Button variant="brand" className="gap-2" onClick={handleGenerate} disabled={acting}>
                {acting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : graph?.status === "COMPLETED" || graph?.status === "FAILED" ? (
                  <RefreshCw className="h-4 w-4" />
                ) : (
                  <Network className="h-4 w-4" />
                )}
                {graph?.status === "COMPLETED" || graph?.status === "FAILED" ? "Rebuild" : "Build graph"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
