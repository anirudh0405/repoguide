"use client";

import { CheckCircle2, Circle, Loader2 } from "lucide-react";

import type { AnalysisPhase } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ProgressStep {
  label: string;
  state: "done" | "active" | "pending";
}

function buildSteps(status: AnalysisPhase): ProgressStep[] {
  const steps: { label: string; done: boolean; active: boolean }[] = [
    { label: "Repository connected", done: true, active: false },
    { label: "Files discovered", done: status === "ANALYZING" || status === "COMPLETED", active: status === "PARSING" },
    { label: "Languages detected", done: status === "COMPLETED", active: status === "ANALYZING" },
    { label: "Dependencies analyzed", done: status === "COMPLETED", active: status === "ANALYZING" },
    { label: "Building project structure", done: status === "COMPLETED", active: status === "ANALYZING" },
  ];
  return steps.map((step) => ({
    label: step.label,
    state: step.done ? "done" : step.active ? "active" : "pending",
  }));
}

const statusTitles: Record<AnalysisPhase, string> = {
  QUEUED: "Queued",
  DOWNLOADING: "Downloading repository",
  PARSING: "Discovering files",
  ANALYZING: "Analyzing codebase",
  COMPLETED: "Analysis complete",
  FAILED: "Analysis failed",
};

export function AnalysisProgress({
  status,
  step,
}: {
  status: AnalysisPhase;
  step: string | null;
}) {
  const steps = buildSteps(status);

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-brand-muted text-brand">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">
          {statusTitles[status]}
        </h2>
        {step && <p className="mt-1 text-sm text-muted-foreground">{step}</p>}
      </div>

      <ol className="space-y-3">
        {steps.map((item) => (
          <li
            key={item.label}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-4 py-3",
              item.state === "active" && "border-brand/40 bg-brand-muted/40",
              item.state === "done" && "border-success/30 bg-success/5",
              item.state === "pending" && "border bg-muted/20 opacity-70"
            )}
          >
            {item.state === "done" && <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />}
            {item.state === "active" && (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand" />
            )}
            {item.state === "pending" && <Circle className="h-5 w-5 shrink-0 text-muted-foreground/50" />}
            <span
              className={cn(
                "text-sm font-medium",
                item.state === "done" && "text-foreground",
                item.state === "active" && "text-foreground",
                item.state === "pending" && "text-muted-foreground"
              )}
            >
              {item.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}