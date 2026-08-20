"use client";

import * as React from "react";
import { Bot, MessageSquare } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface IndexState {
  status: string;
  chunkCount: number;
}

export function ChatPanel({ projectId }: { projectId: string }) {
  const [state, setState] = React.useState<{
    loading: boolean;
    index: IndexState | null;
  }>({ loading: true, index: null });

  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${projectId}/index`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { index: IndexState | null };
        if (!cancelled) setState({ loading: false, index: body.index });
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, index: null });
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const status = state.index?.status;
  const ready = status === "COMPLETED" && (state.index?.chunkCount ?? 0) > 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                ready ? "bg-brand-muted text-brand" : "bg-muted text-muted-foreground"
              )}
            >
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-[family-name:var(--font-display)] text-base font-bold">
                Codebase Q&amp;A
              </h3>
              <p className="mt-0.5 max-w-lg text-sm text-muted-foreground">
                {state.loading
                  ? "Checking…"
                  : ready
                    ? `Ask questions about this codebase. Answers come with sources you can open. (${state.index?.chunkCount?.toLocaleString()} indexed chunks)`
                    : "Ask natural-language questions about this repository and get answers grounded in its code."}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {ready ? (
              <Button asChild variant="brand" className="gap-2">
                <Link href={`/projects/${projectId}/chat`}>
                  <MessageSquare className="h-4 w-4" />
                  Ask questions
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="gap-2">
                <Link href={`/projects/${projectId}/chat`}>
                  <MessageSquare className="h-4 w-4" />
                  Set up Q&amp;A
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}