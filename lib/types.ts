export type AnalysisPhase = "QUEUED" | "DOWNLOADING" | "PARSING" | "ANALYZING" | "COMPLETED" | "FAILED";

export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export type AnalysisStatus = AnalysisPhase;

export interface LanguageStats {
  files: number;
  lines: number;
}

export interface ImportantFileInfo {
  path: string;
  kind: string;
}

export interface EntryPointInfo {
  path: string;
  confidence: Confidence;
  note?: string;
}

export interface AnalysisSummary {
  fileCount: number;
  lineCount: number;
  languages: Record<string, LanguageStats>;
  frameworks: string[];
  packageManagers: string[];
  importantFiles: ImportantFileInfo[];
  entryPoints: EntryPointInfo[];
  directoryTree: string;
  defaultBranch: string;
}

export interface ProjectAnalysis {
  id: string;
  status: AnalysisPhase;
  step: string | null;
  error: string | null;
  summary: AnalysisSummary | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface Repository {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  visibility: string;
  stars: number;
  forks: number;
  updatedAt: string;
  defaultBranch: string;
  url: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  language: string | null;
  status: AnalysisStatus;
  createdAt: string;
  repository: {
    owner: string;
    name: string;
    fullName: string;
    description: string | null;
    language: string | null;
    visibility: string;
    stars: number;
    url: string;
    defaultBranch: string;
    updatedAt: string;
  };
}