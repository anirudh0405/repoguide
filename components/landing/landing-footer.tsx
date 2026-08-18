import Link from "next/link";

import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";

const productLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Repositories", href: "/repositories" },
  { label: "Pricing", href: "/#pricing" },
];

const resourcesLinks = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Features", href: "/#features" },
  { label: "FAQ", href: "/#faq" },
];

export function LandingFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <Logo />
            <p className="max-w-xs text-sm text-muted-foreground">
              The AI-powered map for any codebase. Onboard faster, understand more, ship sooner.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">Product</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">Resources</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {resourcesLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">Appearance</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Theme
              <ThemeToggle />
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} RepoGuide. All rights reserved.</p>
          <p>Built for developers, by developers.</p>
        </div>
      </div>
    </footer>
  );
}
