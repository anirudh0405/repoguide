// Phase 6 — architecture graph types.
//
// The architecture model is a small, evidence-backed graph: components
// (nodes) and the relationships between them (edges). Every node and edge
// carries the file/package evidence it was derived from, and every edge has
// an explicit confidence level. Nothing here is invented — if there is no
// repository evidence, there is no node and no edge.

import type { Confidence } from "@/lib/types";

export const COMPONENT_TYPES = [
  "frontend",
  "backend",
  "api",
  "auth",
  "database",
  "service",
  "worker",
  "external",
  "storage",
  "queue",
] as const;

export type ComponentType = (typeof COMPONENT_TYPES)[number];

export interface ComponentMeta {
  label: string;
  description: string;
}

export const COMPONENT_META: Record<ComponentType, ComponentMeta> = {
  frontend: { label: "Frontend", description: "User interface" },
  backend: { label: "Backend", description: "Server-side application code" },
  api: { label: "API", description: "HTTP routes and controllers" },
  auth: { label: "Authentication", description: "Sign-in, sessions, and access control" },
  database: { label: "Database", description: "Data storage and schema" },
  service: { label: "Service", description: "Internal business logic" },
  worker: { label: "Worker", description: "Background jobs and scheduled tasks" },
  external: { label: "External service", description: "Third-party API used by this project" },
  storage: { label: "Storage", description: "File or object storage" },
  queue: { label: "Queue", description: "Message queue or event bus" },
};

export interface EdgeEvidence {
  kind: "import" | "http-call" | "package" | "config" | "convention";
  detail: string;
}

export interface ArchNode {
  id: string;
  type: ComponentType;
  label: string;
  description: string;
  /** Representative file paths that make up this component (capped). */
  files: string[];
  /** True count of files mapped to this component. */
  fileCount: number;
  /** External packages these files use (evidence for edges/description). */
  dependencies: string[];
}

export interface ArchEdge {
  id: string;
  source: string;
  target: string;
  confidence: Confidence;
  evidence: EdgeEvidence[];
}

export interface ArchitectureSummaryStats {
  majorComponents: number;
  importantFiles: number;
  externalServices: number;
  databases: number;
}

export interface ArchitectureModel {
  nodes: ArchNode[];
  edges: ArchEdge[];
  summary: ArchitectureSummaryStats;
  /** Caveats a reader should know — e.g. which parts could not be inferred. */
  notes: string[];
}

export type ArchitectureStatus = "GENERATING" | "COMPLETED" | "FAILED";

export type ArchitectureStep =
  | "analysis-loaded"
  | "downloading"
  | "scanning"
  | "mapping"
  | "building";
