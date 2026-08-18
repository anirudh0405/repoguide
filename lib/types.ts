export type AnalysisStatus = "not_analyzed" | "analyzed" | "analyzing" | "queued" | "failed";

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