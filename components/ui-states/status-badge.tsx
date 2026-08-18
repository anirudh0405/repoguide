import { AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { AnalysisStatus } from "@/lib/types";

const statusConfig: Record<
  AnalysisStatus,
  { label: string; variant: "success" | "info" | "warning" | "destructive" | "secondary"; icon?: typeof Clock }
> = {
  analyzed: { label: "Analyzed", variant: "success", icon: CheckCircle2 },
  analyzing: { label: "Analyzing", variant: "info", icon: Loader2 },
  queued: { label: "Queued", variant: "warning", icon: Clock },
  failed: { label: "Failed", variant: "destructive", icon: AlertCircle },
};

export function StatusBadge({ status, className }: { status: AnalysisStatus; className?: string }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={className}>
      {Icon && <Icon className={status === "analyzing" ? "h-3 w-3 animate-spin" : "h-3 w-3"} />}
      {config.label}
    </Badge>
  );
}
