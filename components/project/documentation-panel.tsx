"use client";

import * as React from "react";
import { AlertTriangle, BookOpen, Loader2, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type GuideStatus = "GENERATING" | "COMPLETED" | "FAILED";

interface GuideSummary {
  id: string;
  status: GuideStatus;
  error: string | null;
  model: string | null;
}

interface DocsResponse {
  guide: GuideSummary | null;
  outdated: boolean;
}

export function DocumentationPanel({ projectId }: { projectId: string }) {
  const [state, setState] = React.useState<{ loading: boolean; guide: GuideSummary | null; outdated: boolean; error: string | null }>({
    loading: true,
    guide: null,
    outdated: false,
    error: null,
  });
  const [acting, setActing] = React.useState(false);

  const refresh = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/documentation`, { cache: "no-store" });
      if (!response.ok) return;
      const body = (await response.json()) as DocsResponse;
      setState((prev) => ({ ...prev, guide: body.guide, outdated: body.outdated, loading: false }));
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [projectId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  // Follow in-flight generation so the panel flips to "View" on its own.
  const generating = state.guide?.status === "GENERATING";
  React.useEffect(() => {
    if (!generating) return;
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(timer);
  }, [generating, refresh]);

  const handleGenerate = async () => {
    if (acting) return;
    setActing(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/documentation`, { method: "POST" });
      const body = (await response.json()) as DocsResponse & { error?: string };
      if (!response.ok) {
        setState((prev) => ({ ...prev, error: body.error ?? "Could not start generating." }));
      } else {
        setState((prev) => ({ ...prev, error: null }));
        await refresh();
      }
    } catch {
      setState((prev) => ({ ...prev, error: "Could not start generating." }));
    } finally {
      setActing(false);
    }
  };

  const guide = state.guide;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                guide?.status === "COMPLETED"
                  ? "bg-brand-muted text-brand"
                  : guide?.status === "FAILED"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {guide?.status === "COMPLETED" ? (
                <BookOpen className="h-5 w-5" />
              ) : guide?.status === "FAILED" ? (
                <AlertTriangle className="h-5 w-5" />
              ) : generating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Wand2 className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-[family-name:var(--font-display)] text-base font-bold">
                Onboarding guide
              </h3>
              <p className="mt-0.5 max-w-lg text-sm text-muted-foreground">
                {state.loading
                  ? "Checking…"
                  : guide?.status === "COMPLETED"
                    ? "An AI-written guide for this codebase is ready."
                    : guide?.status === "GENERATING"
                      ? "Generating the guide — you can watch progress on the guide page."
                      : guide?.status === "FAILED"
                        ? "The last generation attempt failed."
                        : "A guided walkthrough of this codebase, written with AI."}
              </p>
              {state.outdated && (
                <p className="mt-1 text-xs font-medium text-warning">
                  The repository changed since this guide was generated.
                </p>
              )}
              {state.error && <p className="mt-1 text-xs text-destructive">{state.error}</p>}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {guide?.status === "COMPLETED" && (
              <Button asChild variant="outline" className="gap-2">
                <Link href={`/projects/${projectId}/documentation`}>
                  <BookOpen className="h-4 w-4" />
                  View guide
                </Link>
              </Button>
            )}
            {guide?.status === "FAILED" && (
              <Button asChild variant="outline" className="gap-2">
                <Link href={`/projects/${projectId}/documentation`}>
                  <AlertTriangle className="h-4 w-4" />
                  View error
                </Link>
              </Button>
            )}
            {generating && (
              <Button asChild variant="outline" className="gap-2">
                <Link href={`/projects/${projectId}/documentation`}>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Watch progress
                </Link>
              </Button>
            )}
            {guide?.status === "COMPLETED" || guide?.status === "FAILED" ? (
              <Button variant="brand" className="gap-2" onClick={handleGenerate} disabled={acting}>
                {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Regenerate
              </Button>
            ) : guide?.status === "GENERATING" ? null : (
              <Button variant="brand" className="gap-2" onClick={handleGenerate} disabled={acting || state.loading}>
                {acting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generate
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}