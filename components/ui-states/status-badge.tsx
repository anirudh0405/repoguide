import { AlertCircle, CheckCircle2, Clock, Download, FileSearch, ScanLine } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { AnalysisPhase } from "@/lib/types";

const statusConfig: Record<
  AnalysisPhase,
  { label: string; variant: "success" | "info" | "warning" | "destructive" | "secondary"; icon?: typeof Clock }
> = {
  QUEUED: { label: "Queued", variant: "warning", icon: Clock },
  DOWNLOADING: { label: "Downloading", variant: "info", icon: Download },
  PARSING: { label: "Parsing", variant: "info", icon: FileSearch },
  ANALYZING: { label: "Analyzing", variant: "info", icon: ScanLine },
  COMPLETED: { label: "Analyzed", variant: "success", icon: CheckCircle2 },
  FAILED: { label: "Failed", variant: "destructive", icon: AlertCircle },
};

// Legacy status from before Phase 3.
const legacyLabels: Record<string, string> = {
  NOT_ANALYZED: "Not analyzed",
  analyzed: "Analyzed",
  analyzing: "Analyzing",
  queued: "Queued",
  failed: "Failed",
  not_analyzed: "Not analyzed",
};

export function StatusBadge({
  status,
  className,
}: {
  status: AnalysisPhase | string;
  className?: string;
}) {
  const config = statusConfig[status as AnalysisPhase] ?? {
    label: legacyLabels[status] ?? status,
    variant: "secondary" as const,
    icon: undefined,
  };
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={className}>
      {Icon && <Icon className={status === "ANALYZING" ? "h-3 w-3 animate-spin" : "h-3 w-3"} />}
      {config.label}
    </Badge>
  );
}