import { Boxes } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-brand-foreground">
        <Boxes className="h-4 w-4" />
      </span>
      <span className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight">
        RepoGuide
      </span>
    </span>
  );
}

export function ShortLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md bg-brand text-brand-foreground",
        className
      )}
    >
      <Boxes className="h-4 w-4" />
    </span>
  );
}
