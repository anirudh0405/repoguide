import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  hint?: string;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, hint, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border bg-card p-5 shadow-sm transition-colors hover:border-brand/40",
        className
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-muted text-brand">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="font-[family-name:var(--font-display)] text-2xl font-bold leading-none">
          {value}
        </p>
        <p className="mt-1 truncate text-sm text-muted-foreground">{label}</p>
        {hint && <p className="truncate text-xs text-muted-foreground/70">{hint}</p>}
      </div>
    </div>
  );
}