import {
  Braces,
  FileSearch,
  MessageSquareText,
  Network,
  ScrollText,
  ShieldCheck,
  Workflow,
} from "lucide-react";

import { SectionHeading } from "@/components/landing/section-heading";
import { ComingSoon } from "@/components/coming-soon";

const features = [
  {
    icon: Network,
    title: "Architecture map",
    description:
      "A visual diagram of services, modules, and their relationships — extracted directly from your code, not written by hand.",
    tag: "Live",
  },
  {
    icon: FileSearch,
    title: "Important files",
    description:
      "We rank the files new engineers should read first, so onboarding starts with signal instead of a wall of directories.",
    tag: "Live",
  },
  {
    icon: ScrollText,
    title: "Auto-generated docs",
    description:
      "Setup guides, architecture overviews, and flow walkthroughs generated from the repository itself.",
    tag: "Live",
  },
  {
    icon: MessageSquareText,
    title: "Codebase Q&A",
    description:
      "Ask questions in plain English and get answers with file and line references you can verify.",
    tag: "Preview",
  },
  {
    icon: Workflow,
    title: "Flow explorer",
    description:
      "Follow a request from entry point to database query. Understand checkout, auth, and sync flows end to end.",
    tag: "Live",
  },
  {
    icon: ShieldCheck,
    title: "Secure by design",
    description:
      "Read-only access, encrypted at rest, and scoped permissions. Your code is never used to train models.",
    tag: "Live",
  },
  {
    icon: Braces,
    title: "Language support",
    description:
      "TypeScript, JavaScript, Python, Java, Go, and more. New languages are added every month.",
    tag: "Live",
  },
  {
    icon: ScrollText,
    title: "Change summaries",
    description:
      "A digest of what changed since the last analysis, so the map stays fresh as your codebase evolves.",
    tag: "Next phase",
  },
];

export function Features() {
  return (
    <section id="features" className="border-t bg-muted/30 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Features"
          title="Everything needed to ramp up fast"
          description="Built for engineers who would rather read code than a wiki that's already out of date."
        />

        <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col bg-card p-6 transition-colors hover:bg-accent"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-muted text-brand">
                  <feature.icon className="h-4 w-4" />
                </div>
                {feature.tag === "Live" ? (
                  <span className="text-xs font-medium text-success">{feature.tag}</span>
                ) : (
                  <ComingSoon label={feature.tag} />
                )}
              </div>
              <h3 className="mb-2 font-semibold">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
