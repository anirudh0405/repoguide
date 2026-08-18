import { Bot, CornerDownLeft } from "lucide-react";

import { SectionHeading } from "@/components/landing/section-heading";
import { ComingSoon } from "@/components/coming-soon";

const qaPairs = [
  {
    question: "Where does the checkout flow start?",
    answer:
      "Checkout starts in app/(shop)/checkout/page.tsx. It submits to POST /api/checkout, validates inventory, creates a Stripe payment intent, and confirms via the Stripe webhook.",
    refs: ["app/(shop)/checkout/page.tsx", "app/api/checkout/route.ts", "app/api/webhooks/stripe/route.ts"],
  },
  {
    question: "How is authentication wired up?",
    answer:
      "Authentication uses NextAuth v5 with JWT sessions. The session is exposed to server components through lib/auth.ts. The checkout page calls requireUser() to redirect unauthenticated visitors.",
    refs: ["lib/auth.ts", "app/api/auth/[...nextauth]/route.ts"],
  },
  {
    question: "Why is inventory decremented transactionally?",
    answer:
      "To keep stock consistent when checkout races with other purchases. Prisma runs the update and order insert inside a transaction with row-level locking.",
    refs: ["lib/cart/inventory.ts"],
  },
];

export function AiQaSection() {
  return (
    <section className="border-t bg-muted/30 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <SectionHeading
              align="left"
              className="mb-6"
              eyebrow="Codebase Q&A"
              title="Ask your codebase anything"
              description="Answers grounded in the repository you connected — with file references you can jump to and verify yourself."
            />

            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand text-brand-foreground">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Try asking</p>
                  <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
                    <li>• How are background jobs retried?</li>
                    <li>• Which service owns the user profile?</li>
                    <li>• What does /v1/orders/:id do end to end?</li>
                  </ul>
                </div>
                <ComingSoon className="hidden sm:inline-flex" />
              </div>

              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2.5">
                  <p className="flex-1 text-sm text-muted-foreground">
                    Ask about any repository…
                  </p>
                  <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {qaPairs.map((pair) => (
              <div key={pair.question} className="rounded-lg border bg-card p-5">
                <p className="font-medium">{pair.question}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pair.answer}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {pair.refs.map((ref) => (
                    <span
                      key={ref}
                      className="rounded border bg-muted/50 px-2 py-0.5 font-mono text-[11px] text-brand"
                    >
                      {ref}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}