import { Bot, FolderTree, GitBranch, MessageSquareText } from "lucide-react";

import { SectionHeading } from "@/components/landing/section-heading";

const steps = [
  {
    number: "01",
    icon: GitBranch,
    title: "Connect a repository",
    description:
      "Link a GitHub repository with a single click. We only request read access — we never push or modify your code.",
  },
  {
    number: "02",
    icon: FolderTree,
    title: "We map the codebase",
    description:
      "Our engine indexes the repository and builds an architecture map: modules, important files, data flows, and dependencies.",
  },
  {
    number: "03",
    icon: Bot,
    title: "Get onboarding docs",
    description:
      "Receive generated documentation covering setup, architecture, and the flows every new engineer asks about.",
  },
  {
    number: "04",
    icon: MessageSquareText,
    title: "Ask anything",
    description:
      "Chat with the codebase. Ask where things live, how flows work, or why a decision was made — grounded in your actual code.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t bg-background py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="How it works"
          title="From repo to mental model in four steps"
          description="Stop reading READMEs and chasing imports. Get the map that experienced engineers build in their heads."
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group relative rounded-lg border bg-card p-6 transition-colors hover:border-brand/40"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-muted text-brand">
                  <step.icon className="h-4 w-4" />
                </div>
                <span className="font-mono text-sm text-muted-foreground/60">{step.number}</span>
              </div>
              <h3 className="mb-2 font-semibold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
