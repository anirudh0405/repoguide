import { SectionHeading } from "@/components/landing/section-heading";

const faqs = [
  {
    question: "What do I need to connect a repository?",
    answer:
      "Just a GitHub account with a repository you want to understand. We use read-only access — we never push commits, open PRs, or modify your code in any way.",
  },
  {
    question: "How long does an analysis take?",
    answer:
      "Most repositories are analyzed in under five minutes. Small repos finish in under a minute; very large monorepos can take a bit longer. You'll see live progress in the dashboard.",
  },
  {
    question: "Is my code used to train AI models?",
    answer:
      "No. Your code is encrypted at rest and only used to answer questions about your own repository. We never train or benefit from your source code.",
  },
  {
    question: "Which languages are supported?",
    answer:
      "We currently support TypeScript, JavaScript, Python, Java, Go, Rust, and C#. Ruby and PHP support are in progress.",
  },
  {
    question: "Does the analysis stay up to date when the code changes?",
    answer:
      "Yes — re-analyze on demand or on a schedule. Change summaries highlight what's different since the last analysis.",
  },
  {
    question: "Can my whole team use one organization's repositories?",
    answer:
      "Starter is per-person. Team plans add a shared workspace with pooled limits, which arrives in a later phase.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="border-t bg-muted/30 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="FAQ"
          title="Frequently asked questions"
          description="Everything you might wonder before connecting your first repository."
        />

        <div className="divide-y divide-border rounded-lg border bg-card">
          {faqs.map((faq) => (
            <details key={faq.question} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
                {faq.question}
                <span className="shrink-0 text-muted-foreground transition-transform group-open:rotate-45">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}