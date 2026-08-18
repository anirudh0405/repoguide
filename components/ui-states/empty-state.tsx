import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-16 text-center",
        className
      )}
    >
      {Icon && (
        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-md border bg-muted/50 text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
