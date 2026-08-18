import { ArrowDown, Database, CreditCard, LayoutGrid, Lock, Server } from "lucide-react";

import { SectionHeading } from "@/components/landing/section-heading";

const frontendNodes = [
  { label: "Product Catalog", icon: LayoutGrid },
  { label: "Cart & Checkout", icon: CreditCard },
];

function LayerNode({
  title,
  detail,
  icon: Icon,
}: {
  title: string;
  detail: string;
  icon: typeof Server;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-muted text-brand">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

export function ArchitectureExample() {
  return (
    <section className="border-t bg-background py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Example architecture"
          title="What a map looks like"
          description="A real analysis of a Next.js + Stripe storefront. Every box is traceable back to code in the repository."
        />

        <div className="mx-auto max-w-md">
          <div className="space-y-2">
            <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Frontend
            </p>
            <div className="space-y-2">
              {frontendNodes.map((node) => (
                <LayerNode key={node.label} title={node.label} detail="Next.js · React 19" icon={node.icon} />
              ))}
            </div>
          </div>

          <div className="flex justify-center py-2 text-muted-foreground">
            <ArrowDown className="h-4 w-4" />
          </div>

          <LayerNode title="API Routes" detail="/api/* · route handlers" icon={Server} />
          <div className="flex justify-center py-2 text-muted-foreground">
            <ArrowDown className="h-4 w-4" />
          </div>
          <LayerNode title="Authentication" detail="NextAuth v5 · JWT sessions" icon={Lock} />
          <div className="flex justify-center py-2 text-muted-foreground">
            <ArrowDown className="h-4 w-4" />
          </div>
          <LayerNode title="Database" detail="PostgreSQL · Prisma ORM" icon={Database} />

          <div className="mt-6 rounded-lg border bg-muted/40 p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Payment Service
            </p>
            <div className="mt-2 flex justify-center">
              <LayerNode title="Stripe" detail="Webhook handler" icon={CreditCard} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
