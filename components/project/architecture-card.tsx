import { Box, Boxes, FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ArchitectureNode } from "@/lib/types";

const depthColors = [
  "border-brand/50",
  "border-info/40",
  "border-success/40",
  "border-warning/40",
];

export function ArchitectureCard({ root }: { root: ArchitectureNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Boxes className="h-4 w-4 text-brand" />
          Architecture map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ArchitectureTree node={root} depth={0} />
      </CardContent>
    </Card>
  );
}

function ArchitectureTree({ node, depth }: { node: ArchitectureNode; depth: number }) {

  return (
    <div className="space-y-2">
      {depth === 0 && (
        <div className="mb-2 flex items-center gap-2 font-mono text-sm font-semibold">
          <Box className="h-4 w-4 text-brand" />
          {node.name}
        </div>
      )}

      {node.children && (
        <div className={cn("space-y-2", depth > 0 && "ml-4 border-l-2 pl-4", depthColors[depth % depthColors.length])}>
          {node.children.map((child, i) => (
            <div key={i}>
              <div className="rounded-md border bg-card px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="font-mono text-sm font-medium">{child.name}</span>
                  {child.detail && (
                    <span className="text-xs text-muted-foreground">— {child.detail}</span>
                  )}
                </div>
              </div>
              {child.children && <ArchitectureTree node={child} depth={depth + 1} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}