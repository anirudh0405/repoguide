"use client";

import * as React from "react";
import "@xyflow/react/dist/style.css";
import {
  Background,
  BackgroundVariant,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import {
  Boxes,
  Cloud,
  Database,
  Globe,
  KeyRound,
  Layers,
  ListTree,
  Maximize2,
  RefreshCcw,
  Search,
  Server,
  ServerCog,
  Workflow,
} from "lucide-react";

import { FileViewerDialog } from "@/components/project/file-viewer-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  ArchEdge,
  ArchNode as ArchNodeModel,
  ArchitectureModel,
  ComponentType,
} from "@/lib/architecture/types";

// --- Visual identity per node type -------------------------------------------

interface TypeStyle {
  icon: React.ComponentType<{ className?: string }>;
  chip: string;
  ring: string;
}

const TYPE_STYLES: Record<ComponentType, TypeStyle> = {
  frontend: { icon: Globe, chip: "bg-sky-500/15 text-sky-600 dark:text-sky-400", ring: "border-l-sky-500" },
  backend: { icon: ServerCog, chip: "bg-amber-500/15 text-amber-600 dark:text-amber-400", ring: "border-l-amber-500" },
  api: { icon: Server, chip: "bg-brand-muted text-brand", ring: "border-l-brand" },
  auth: { icon: KeyRound, chip: "bg-rose-500/15 text-rose-600 dark:text-rose-400", ring: "border-l-rose-500" },
  database: { icon: Database, chip: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400", ring: "border-l-indigo-500" },
  service: { icon: Layers, chip: "bg-teal-500/15 text-teal-600 dark:text-teal-400", ring: "border-l-teal-500" },
  worker: { icon: ListTree, chip: "bg-orange-500/15 text-orange-600 dark:text-orange-400", ring: "border-l-orange-500" },
  external: { icon: Cloud, chip: "bg-stone-500/15 text-stone-600 dark:text-stone-400", ring: "border-l-stone-500" },
  storage: { icon: Boxes, chip: "bg-lime-500/15 text-lime-700 dark:text-lime-400", ring: "border-l-lime-500" },
  queue: { icon: Workflow, chip: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400", ring: "border-l-fuchsia-500" },
};

const CONFIDENCE_LEGEND: { label: string; sample: React.ReactNode; description: string }[] = [
  {
    label: "High",
    description: "Multiple independent pieces of direct evidence",
    sample: <svg width="34" height="6"><line x1="0" y1="3" x2="34" y2="3" stroke="currentColor" strokeWidth="2" /></svg>,
  },
  {
    label: "Medium",
    description: "A single direct piece of evidence (one file)",
    sample: <svg width="34" height="6"><line x1="0" y1="3" x2="34" y2="3" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" /></svg>,
  },
  {
    label: "Low",
    description: "Indirect evidence only (configuration, conventions)",
    sample: <svg width="34" height="6"><line x1="0" y1="3" x2="34" y2="3" stroke="currentColor" strokeWidth="2" strokeDasharray="2 4" /></svg>,
  },
];

// --- Layout -------------------------------------------------------------------

const NODE_WIDTH = 224;
const NODE_HEIGHT = 68;
const COLUMN_GAP = 110;
const ROW_GAP = 32;

const RANK: Record<ComponentType, number> = {
  frontend: 0,
  api: 1,
  backend: 1,
  auth: 1,
  service: 2,
  worker: 2,
  database: 3,
  storage: 3,
  queue: 3,
  external: 3,
};

type ArchFlowNode = Node<
  { arch: ArchNodeModel; dimmed: boolean; selected: boolean },
  "arch"
>;

function computeLayout(model: ArchitectureModel): { nodes: ArchFlowNode[]; edges: Edge[] } {
  const columns = new Map<number, ArchNodeModel[]>();
  for (const node of model.nodes) {
    const rank = RANK[node.type];
    const list = columns.get(rank) ?? [];
    list.push(node);
    columns.set(rank, list);
  }

  const ranks = Array.from(columns.keys()).sort((a, b) => a - b);
  const nodes: ArchFlowNode[] = [];
  let x = 0;
  for (const rank of ranks) {
    const list = columns.get(rank)!;
    const columnHeight = list.length * NODE_HEIGHT + (list.length - 1) * ROW_GAP;
    let y = -columnHeight / 2;
    for (const node of list.sort((a, b) => b.fileCount - a.fileCount || a.label.localeCompare(b.label))) {
      nodes.push({
        id: node.id,
        type: "arch" as const,
        position: { x, y: y + columnHeight / 2 },
        data: { arch: node, dimmed: false, selected: false },
      });
      y += NODE_HEIGHT + ROW_GAP;
    }
    x += NODE_WIDTH + COLUMN_GAP;
  }

  const edges: Edge[] = model.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    ...(edge.confidence === "MEDIUM"
      ? { animated: false, style: { strokeDasharray: "7 5" } }
      : {}),
    ...(edge.confidence === "LOW"
      ? { style: { strokeDasharray: "2 5" } }
      : {}),
  }));

  return { nodes, edges };
}

// --- Custom node --------------------------------------------------------------

function ArchitectureNodeCard({ data }: NodeProps<ArchFlowNode>) {
  const arch = data.arch;
  const style = TYPE_STYLES[arch.type] ?? TYPE_STYLES.external;
  const Icon = style.icon;

  return (
    <div
      className={cn(
        "flex h-full w-full cursor-pointer items-center gap-3 rounded-lg border border-l-4 bg-card px-3 shadow-sm transition-shadow hover:shadow-md",
        style.ring,
        data.selected && "ring-2 ring-brand"
      )}
      style={{ opacity: data.dimmed ? 0.25 : 1 }}
    >
      <Handle type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-none !bg-muted-foreground/50" />
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", style.chip)}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-[family-name:var(--font-display)] text-sm font-semibold leading-tight">
          {arch.label}
        </span>
        <span className="block text-xs leading-tight text-muted-foreground">
          {arch.fileCount > 0 ? `${arch.fileCount} file${arch.fileCount === 1 ? "" : "s"}` : "configuration"}
        </span>
      </span>
      <Handle type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-none !bg-muted-foreground/50" />
    </div>
  );
}

const nodeTypes = { arch: ArchitectureNodeCard };

// --- Details panel --------------------------------------------------------------

function ConfidenceBadge({ confidence }: { confidence: ArchEdge["confidence"] }) {
  const variant = confidence === "HIGH" ? "success" : confidence === "MEDIUM" ? "warning" : "secondary";
  return (
    <Badge variant={variant} className="text-[10px] uppercase tracking-wide">
      {confidence}
    </Badge>
  );
}

function NodeDetails({
  projectId,
  node,
  model,
}: {
  projectId: string;
  node: ArchNodeModel;
  model: ArchitectureModel;
}) {
  const style = TYPE_STYLES[node.type] ?? TYPE_STYLES.external;
  const Icon = style.icon;

  const relations = model.edges
    .filter((edge) => edge.source === node.id || edge.target === node.id)
    .map((edge) => {
      const otherId = edge.source === node.id ? edge.target : edge.source;
      const other = model.nodes.find((n) => n.id === otherId);
      if (!other) return null;
      return { direction: edge.source === node.id ? "out" : "in", other, edge };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", style.chip)}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="font-[family-name:var(--font-display)] text-base font-bold">{node.label}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{node.description}</p>
        </div>
      </div>

      {node.files.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Relevant files
            {node.fileCount > node.files.length && (
              <span className="ml-1 normal-case text-muted-foreground/70">
                (showing {node.files.length} of {node.fileCount})
              </span>
            )}
          </p>
          <ul className="space-y-1">
            {node.files.map((path) => (
              <li key={path}>
                <FileViewerDialog projectId={projectId} path={path}>
                  <span className="truncate font-mono text-xs">{path}</span>
                  <FileCodeIcon />
                </FileViewerDialog>
              </li>
            ))}
          </ul>
        </div>
      )}

      {node.dependencies.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Dependencies
          </p>
          <div className="flex flex-wrap gap-1.5">
            {node.dependencies.map((dep) => (
              <span
                key={dep}
                className="rounded-full border bg-muted/30 px-2 py-0.5 font-mono text-xs"
              >
                {dep}
              </span>
            ))}
          </div>
        </div>
      )}

      {relations.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Related components
          </p>
          <ul className="space-y-1.5">
            {relations.map(({ direction, other, edge }) => (
              <li key={edge.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">
                  <span className="text-muted-foreground">
                    {direction === "out" ? "connects to" : "receives from"}
                  </span>{" "}
                  <span className="font-medium">{other.label}</span>
                </span>
                <ConfidenceBadge confidence={edge.confidence} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FileCodeIcon() {
  return <span className="text-[10px] text-muted-foreground">view</span>;
}

// --- Explorer -------------------------------------------------------------------

function ExplorerInner({
  projectId,
  model,
}: {
  projectId: string;
  model: ArchitectureModel;
}) {
  const initial = React.useMemo(() => computeLayout(model), [model]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, , onEdgesChange] = useEdgesState(initial.edges);
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const { fitView } = useReactFlow();

  const resetLayout = React.useCallback(() => {
    const fresh = computeLayout(model);
    setNodes(fresh.nodes);
    setSelectedId(null);
    window.setTimeout(() => void fitView({ padding: 0.15, duration: 300 }), 30);
  }, [model, setNodes, fitView]);

  // Dim non-matching nodes while searching.
  React.useEffect(() => {
    const q = query.trim().toLowerCase();
    setNodes((current) =>
      current.map((node) => {
        const arch = node.data.arch as ArchNodeModel;
        const matches =
          q.length === 0 ||
          arch.label.toLowerCase().includes(q) ||
          arch.type.includes(q) ||
          arch.dependencies.some((d) => d.toLowerCase().includes(q)) ||
          arch.files.some((f) => f.toLowerCase().includes(q));
        return { ...node, data: { ...node.data, dimmed: !matches } };
      })
    );
  }, [query, setNodes]);

  React.useEffect(() => {
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        data: { ...node.data, selected: node.id === selectedId },
      }))
    );
  }, [selectedId, setNodes]);

  const selectedNode = selectedId
    ? model.nodes.find((n) => n.id === selectedId) ?? null
    : null;

  const handleFit = () => void fitView({ padding: 0.15, duration: 300 });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-52 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search components, files…"
              className="pl-8"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleFit}>
            <Maximize2 className="h-3.5 w-3.5" />
            Fit to screen
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={resetLayout}>
            <RefreshCcw className="h-3.5 w-3.5" />
            Reset layout
          </Button>
          <span className="hidden text-xs text-muted-foreground md:inline">
            Drag nodes · scroll to zoom · click for details
          </span>
        </div>

        <div className="h-[520px] overflow-hidden rounded-xl border bg-card">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            onInit={() => window.setTimeout(() => void fitView({ padding: 0.15 }), 60)}
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{
              type: "smoothstep",
              markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
              style: { stroke: "var(--muted-foreground)", strokeWidth: 2 },
            }}
            fitView
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1.5} />
          </ReactFlow>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-xs text-muted-foreground">
          {CONFIDENCE_LEGEND.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-2" title={item.description}>
              <span className="text-foreground/70">{item.sample}</span>
              {item.label} confidence
            </span>
          ))}
        </div>
      </div>

      <Card className="self-start">
        <CardContent className="max-h-[580px] overflow-auto p-5">
          {selectedNode ? (
            <NodeDetails projectId={projectId} node={selectedNode} model={model} />
          ) : (
            <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 text-center">
              <Workflow className="h-6 w-6 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Click any component in the graph to see its description, relevant files,
                dependencies, and connections.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ArchitectureGraphExplorer({
  projectId,
  model,
}: {
  projectId: string;
  model: ArchitectureModel;
}) {
  return (
    <ReactFlowProvider>
      <ExplorerInner projectId={projectId} model={model} />
    </ReactFlowProvider>
  );
}
