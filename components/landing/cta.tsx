import { ArrowRight, GitBranch } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function LandingCta() {
  return (
    <section className="border-t bg-background py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-lg border bg-muted/50 px-6 py-16 text-center sm:px-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--brand-muted),transparent_70%)]"
          />
          <div className="relative">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
              Stop reading READMEs. Start understanding.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              Connect a repository and get the architecture map, docs, and answers your whole team
              can rely on — in minutes.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
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
        </div>
      </div>
    </section>
  );
}