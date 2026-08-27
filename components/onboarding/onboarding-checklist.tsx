"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight, GitBranch, FileText, MessageSquare, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  id: string;
  label: string;
  completed: boolean;
  current: boolean;
}

export function OnboardingChecklist() {
  const [data, setData] = useState<{
    completed: boolean;
    currentStep: string;
    steps: OnboardingStep[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/onboarding")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleStepComplete = async (stepId: string) => {
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: stepId, completed: true }),
      });
      const json = await res.json();
      if (json.success) {
        setData((prev) => {
          if (!prev) return prev;
          const stepIndex = prev.steps.findIndex((s) => s.id === stepId);
          return {
            ...prev,
            completed: json.completed,
            currentStep: json.nextStep ?? prev.currentStep,
            steps: prev.steps.map((s, i) => ({
              ...s,
              completed: json.completed || i <= stepIndex,
              current: !json.completed && s.id === json.nextStep,
            })),
          };
        });
      }
    } catch {
      // Ignore errors
    }
  };

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading onboarding checklist">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-4 bg-muted rounded w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data || data.completed) return null;

  const stepIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    "connect-repo": GitBranch,
    "analyze-repo": Sparkles,
    "read-guide": FileText,
    "ask-question": MessageSquare,
  };

  const stepRoutes: Record<string, string> = {
    "connect-repo": "/repositories",
    "analyze-repo": "/dashboard",
    "read-guide": "/dashboard",
    "ask-question": "/dashboard",
  };

  const stepDescriptions: Record<string, string> = {
    "connect-repo": "Install the RepoGuide GitHub App and pick a repository to analyze.",
    "analyze-repo": "Click Analyze on a repository to download and map its codebase.",
    "read-guide": "Generate the AI onboarding guide to understand the architecture.",
    "ask-question": "Use the Q&A chat to ask anything about the codebase.",
  };

  return (
    <section className="space-y-4" aria-labelledby="onboarding-title">
      <div className="flex items-center justify-between">
        <h2 id="onboarding-title" className="font-[family-name:var(--font-display)] text-xl font-bold">
          Welcome to RepoGuide
        </h2>
        <span className="text-sm text-muted-foreground">
          {data.steps.filter((s) => s.completed).length} / {data.steps.length} complete
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Follow these steps to understand your first codebase in minutes.
      </p>

      <div className="space-y-3" role="list" aria-label="Onboarding steps">
        {data.steps.map((step, index) => {
          const Icon = stepIcons[step.id];
          const isCurrent = step.current;
          const isCompleted = step.completed;
          const route = stepRoutes[step.id];

          return (
            <Card
              key={step.id}
              className={cn(
                "relative overflow-hidden transition-all duration-200",
                isCompleted && "bg-success/5 border-success/20",
                isCurrent && "border-brand/50 shadow-brand/5"
              )}
              role="listitem"
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg shrink-0 transition-colors",
                      isCompleted && "bg-success text-success-foreground",
                      isCurrent && !isCompleted && "bg-brand text-brand-foreground animate-pulse",
                      !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                    )}
                    aria-hidden="true"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{step.label}</span>
                      {isCurrent && !isCompleted && (
                        <span className="rounded bg-brand-muted px-2 py-0.5 text-[11px] font-medium text-brand">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {stepDescriptions[step.id]}
                    </p>
                  </div>
                  {isCurrent && !isCompleted && (
                    <Button asChild size="sm" className="shrink-0">
                      <Link href={route}>
                        Get started
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                  {isCompleted && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-success hover:bg-success/10"
                      onClick={() => handleStepComplete(step.id)}
                      aria-label={`Reopen ${step.label}`}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Connecting line */}
                {index < data.steps.length - 1 && (
                  <div className="absolute left-5 top-14 bottom-0 w-0.5 bg-muted" aria-hidden="true" />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Once you complete all steps, this checklist will disappear. You can always return to it from
        Settings.
      </p>
    </section>
  );
}