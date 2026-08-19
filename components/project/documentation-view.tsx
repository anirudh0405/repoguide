"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  Wand2,
} from "lucide-react";

import { OnboardingGuideContent } from "@/components/project/onboarding-guide-content";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { OnboardingGuideContent as GuideContent } from "@/lib/ai/onboarding-schema";
import { formatRelativeTime } from "@/lib/utils";

type GuideStatus = "GENERATING" | "COMPLETED" | "FAILED";

interface GuideData {
  id: string;
  status: GuideStatus;
  step: string | null;
  error: string | null;
  model: string | null;
  commitSha: string | null;
  analysisId: string | null;
  content: GuideContent | null;
  createdAt: string;
  updatedAt: string;
}

interface DocsResponse {
  project: {
    id: string;
    name: string;
    status: string;
    repository: { owner: string; name: string; fullName: string; defaultBranch: string };
  };
  analysis: { id: string; status: string; commitSha: string | null; completedAt: string | null } | null;
  guide: GuideData | null;
  outdated: boolean;
}

const STAGES: { step: string | null; label: string; terminal: GuideStatus | null }[] = [
  { step: "analysis-loaded", label: "Repository analysis loaded", terminal: null },
  { step: "files-selected", label: "Important files selected", terminal: null },
  { step: "context-prepared", label: "Codebase context prepared", terminal: null },
  { step: "analyzing", label: "Nemotron analyzing codebase", terminal: null },
  { step: "building", label: "Building onboarding guide", terminal: "COMPLETED" },
];

function progressIndex(status: GuideStatus, step: string | null): number {
  if (status === "COMPLETED") return STAGES.length;
  if (status === "FAILED") return -1;
  const index = STAGES.findIndex((stage) => stage.step === step);
  return index >= 0 ? index + 1 : 0;
}

export function DocumentationView({
  projectId,
  initial,
}: {
  projectId: string;
  initial: DocsResponse;
}) {
  const [data, setData] = React.useState<DocsResponse>(initial);
  const [starting, setStarting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const guide = data.guide;
  const generating = guide?.status === "GENERATING";
  const failed = guide?.status === "FAILED";
  const completed = guide?.status === "COMPLETED";

  const fetchGuide = React.useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}/documentation`, { cache: "no-store" });
    if (response.ok) {
      const next = (await response.json()) as DocsResponse;
      setData(next);
    }
  }, [projectId]);

  // Poll while a generation is in flight.
  React.useEffect(() => {
    if (!generating) return;
    const timer = window.setInterval(() => {
      void fetchGuide();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [generating, fetchGuide]);

  const handleGenerate = async () => {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/documentation`, { method: "POST" });
      const body = (await response.json()) as DocsResponse & { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Could not start generating the guide.");
        return;
      }
      await fetchGuide();
    } catch {
      setError("Could not start generating the guide.");
    } finally {
      setStarting(false);
    }
  };

  if (completed && guide?.content) {
    const isOutdated = data.outdated;
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-muted text-brand">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
                  Onboarding guide
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Generated {formatRelativeTime(guide.updatedAt)}
                  {guide.model ? ` · ${guide.model}` : ""}
                </p>
                {isOutdated && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-warning">
                    <RefreshCw className="h-3 w-3" />
                    The repository has changed since this guide was generated.
                  </p>
                )}
              </div>
            </div>
            <Button onClick={handleGenerate} disabled={starting} className="gap-2">
              {starting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Regenerate
            </Button>
          </CardContent>
        </Card>

        <OnboardingGuideContent projectId={projectId} content={guide.content} />
      </div>
    );
  }

  if (generating) {
    const progress = progressIndex("GENERATING", guide?.step ?? null);
    return (
      <div className="mx-auto w-full max-w-xl">
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-brand" />
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
                Generating onboarding guide
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
              This usually takes a minute or two. This page updates automatically.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (failed && guide) {
    return (
      <div className="mx-auto w-full max-w-xl">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl font-bold">
              Guide generation failed
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {guide.error ?? "Something went wrong while generating the onboarding guide."}
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
            <Wand2 className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl font-bold">
            No onboarding guide yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            RepoGuide reads this repository with NVIDIA Nemotron and writes a structured guide —
            what it does, its stack, architecture, important files, application flows, and how to
            get started.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            Based on the completed repository analysis — no AI costs until you generate.
          </div>
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
          <Button className="mt-6 gap-2" onClick={handleGenerate} disabled={starting}>
            {starting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate onboarding guide
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}