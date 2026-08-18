import { ArrowRight, FileCode2, GitBranch, MessageSquare } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const statusLines = [
  { icon: GitBranch, label: "Cloning repository", detail: "acme/ecommerce-platform · main" },
  { icon: FileCode2, label: "Indexing 214 files", detail: "TypeScript · 48,210 lines" },
  { icon: MessageSquare, label: "Mapping architecture", detail: "5 modules detected" },
];

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_at_top,var(--brand-muted),transparent_60%)]"
      />
      <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-16 sm:px-6 sm:pt-28">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Badge variant="brand" className="mb-6 px-3 py-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
            </span>
            AI codebase analysis — preview
          </Badge>

          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight sm:text-6xl">
            Understand any codebase <span className="text-brand">in minutes</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Connect your GitHub repository and get an AI-powered map of its architecture, important
            files, documentation, and codebase Q&amp;A.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="/repositories">
                <GitBranch className="h-4 w-4" />
                Connect GitHub
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <Link href="/dashboard">
                View Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            Free for up to 3 repositories · No credit card required
          </p>
        </div>

        <div className="relative mx-auto mt-16 max-w-4xl">
          <div className="overflow-hidden rounded-lg border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-destructive/70" />
                <span className="h-3 w-3 rounded-full bg-warning/70" />
                <span className="h-3 w-3 rounded-full bg-success/70" />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <GitBranch className="h-3.5 w-3.5" />
                acme/ecommerce-platform — analysis
              </div>
              <span className="rounded bg-brand-muted px-2 py-0.5 text-xs font-medium text-brand">
                live
              </span>
            </div>

            <div className="grid gap-px bg-border sm:grid-cols-2">
              <div className="space-y-3 bg-card p-5 font-mono text-xs">
                {statusLines.map((line) => (
                  <div key={line.label} className="flex items-start gap-3">
                    <line.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                    <div>
                      <p className="text-foreground">{line.label}</p>
                      <p className="text-muted-foreground">{line.detail}</p>
                    </div>
                  </div>
                ))}
                <div className="mt-4 rounded border bg-muted/40 p-3">
                  <p className="text-muted-foreground">Architecture detected</p>
                  <p className="mt-1 text-foreground">
                    Frontend <span className="text-brand">↓</span> API Routes{" "}
                    <span className="text-brand">↓</span> Database
                  </p>
                </div>
              </div>

              <div className="hidden bg-card p-5 font-mono text-xs sm:block">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground"># Files</p>
                  <p className="text-foreground">214</p>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-muted-foreground">Modules</p>
                  <p className="text-foreground">5</p>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-muted-foreground">Flows</p>
                  <p className="text-foreground">3</p>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-muted-foreground">Docs generated</p>
                  <p className="text-foreground">4</p>
                </div>
                <div className="mt-4 rounded border bg-muted/40 p-3">
                  <p className="text-brand">→</p>
                  <p className="mt-1 text-foreground">
                    Where does the checkout flow start and which services does it touch?
                  </p>
                  <p className="mt-2 text-muted-foreground">
                    Checkout starts at <span className="text-foreground">app/(shop)/checkout</span>,
                    submits to POST /api/checkout, and confirms via the Stripe webhook.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
