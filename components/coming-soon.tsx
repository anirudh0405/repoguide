import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ComingSoon({
  label = "Coming soon",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <Badge variant="brand" className={cn("pointer-events-none select-none", className)}>
      <Sparkles className="h-3 w-3" />
      {label}
    </Badge>
  );
}
