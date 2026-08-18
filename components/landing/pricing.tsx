import { Check, X } from "lucide-react";

import { SectionHeading } from "@/components/landing/section-heading";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

const tiers = [
  {
    name: "Starter",
    price: "$0",
    period: "/month",
    description: "For individuals ramping on their own projects.",
    features: [
      "3 analyzed repositories",
      "Architecture maps",
      "Auto-generated docs",
      "Flow explorer",
      "Community support",
    ],
    cta: "Start free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    description: "For engineers onboarding across real codebases.",
    features: [
      "Unlimited repositories",
      "Everything in Starter",
      "Codebase Q&A chat",
      "Change summaries",
      "Priority analysis queue",
      "Email support",
    ],
    cta: "Coming in phase 2",
    highlighted: true,
  },
  {
    name: "Team",
    price: "$49",
    period: "/month",
    description: "For teams standardizing onboarding.",
    features: [
      "Everything in Pro",
      "Shared team workspace",
      "SSO & SAML",
      "Audit logs",
      "Dedicated support",
    ],
    cta: "Coming in phase 2",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="border-t bg-background py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Pricing"
          title="Simple pricing that scales with you"
          description="Start free with three repositories. Upgrade when the map becomes part of your daily workflow."
        />

        <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                "flex flex-col rounded-lg border bg-card p-6",
                tier.highlighted && "border-brand shadow-lg shadow-brand/5"
              )}
            >
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{tier.name}</h3>
                  {tier.highlighted && (
                    <span className="rounded bg-brand-muted px-1.5 py-0.5 text-[11px] font-medium text-brand">
                      Popular
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{tier.description}</p>
              </div>

              <div className="mb-6">
                <span className="font-[family-name:var(--font-display)] text-4xl font-bold">
                  {tier.price}
                </span>
                <span className="text-muted-foreground">{tier.period}</span>
              </div>

              <ul className="mb-8 flex-1 space-y-2.5">
                {tier.features.map((feature) => {
                  const available = !feature.startsWith("Coming");
                  return (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      {available ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      ) : (
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className={available ? "" : "text-muted-foreground"}>{feature}</span>
                    </li>
                  );
                })}
              </ul>

              <Button asChild variant={tier.highlighted ? "brand" : "outline"} className="w-full">
                <Link href="/repositories">{tier.cta}</Link>
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          All plans include read-only access. Billing is handled through Stripe in a later phase;{" "}
          <span className="text-foreground">Starter is free to use now.</span>
        </p>
      </div>
    </section>
  );
}