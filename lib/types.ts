export type AnalysisStatus = "analyzed" | "analyzing" | "queued" | "failed";

export type Visibility = "public" | "private";

export interface Repository {
  id: string;
  owner: string;
  name: string;
  description: string;
  language: string;
  visibility: Visibility;
  stars: number;
  forks: number;
  updatedAt: string;
  defaultBranch: string;
}

export interface Project {
  id: string;
  repositoryId: string;
  name: string;
  description: string;
  language: string;
  status: AnalysisStatus;
  analyzedAt?: string;
  progress?: number;
  techStack: string[];
  stats: {
    files: number;
    folders: number;
    linesOfCode: number;
    contributors: number;
  };
}

export interface ArchitectureNode {
  name: string;
  detail?: string;
  children?: ArchitectureNode[];
}

export interface FileNode {
  name: string;
  type?: "folder" | "file";
  children?: FileNode[];
  meta?: string;
}

export interface DocEntry {
  title: string;
  summary: string;
  sections: { heading: string; body: string }[];
}

export interface FlowStep {
  title: string;
  description: string;
  entries: { method: string; path: string }[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface AnalysisIssue {
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  file: string;
}

export interface ProjectDetail {
  project: Project;
  architecture: ArchitectureNode;
  fileTree: FileNode;
  documentation: DocEntry[];
  flows: FlowStep[];
  chat: ChatMessage[];
  issues: AnalysisIssue[];
}
