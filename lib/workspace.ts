import "server-only";

import { getPrisma } from "@/lib/db";
import {
  GitHubError,
  getAppInfo,
  getFreshUserAccessToken,
  getInstallationAccessToken,
  getInstallationRepositories,
  syncInstallations,
} from "@/lib/github";
import type { AnalysisStatus, Project } from "@/lib/types";

export interface WorkspaceRepo {
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

export interface WorkspaceState {
  configured: boolean;
  authenticated: boolean;
  installations: number;
  installUrl: string | null;
  repositories: WorkspaceRepo[];
  error: string | null;
}

export async function getInstallUrl(): Promise<string | null> {
  try {
    const app = await getAppInfo();
    if (app.html_url) return `${app.html_url}/installations/new`;
    return null;
  } catch {
    return null;
  }
}

export async function getWorkspaceState(userId: string): Promise<WorkspaceState> {
  const prisma = getPrisma();
  if (!prisma) {
    return {
      configured: false,
      authenticated: true,
      installations: 0,
      installUrl: null,
      repositories: [],
      error: null,
    };
  }

  const account = await prisma.gitHubAccount.findUnique({ where: { userId } });
  if (!account) {
    return {
      configured: true,
      authenticated: false,
      installations: 0,
      installUrl: null,
      repositories: [],
      error: null,
    };
  }

  try {
    const userToken = await getFreshUserAccessToken(account);
    await syncInstallations(userId, userToken);

    const installations = await prisma.gitHubInstallation.findMany({ where: { userId } });
    const installUrl = await getInstallUrl();

    let repositories: WorkspaceRepo[] = [];
    for (const installation of installations) {
      const installationToken = await getInstallationAccessToken(installation.githubId);
      const repos = await getInstallationRepositories(installationToken);
      for (const repo of repos) {
        repositories.push({
          id: String(repo.id),
          owner: repo.owner.login,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          language: repo.language,
          visibility: repo.private ? "private" : "public",
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          updatedAt: repo.pushed_at ?? repo.updated_at ?? new Date().toISOString(),
          defaultBranch: repo.default_branch,
          url: repo.html_url,
        });
      }
    }

    const seen = new Set<string>();
    repositories = repositories.filter((repo) => {
      if (seen.has(repo.fullName)) return false;
      seen.add(repo.fullName);
      return true;
    });

    return {
      configured: true,
      authenticated: true,
      installations: installations.length,
      installUrl,
      repositories,
      error: null,
    };
  } catch (error) {
    if (error instanceof GitHubError) {
      return {
        configured: true,
        authenticated: true,
        installations: 0,
        installUrl: null,
        repositories: [],
        error: error.message,
      };
    }
    return {
      configured: true,
      authenticated: true,
      installations: 0,
      installUrl: null,
      repositories: [],
      error: "Could not load repositories from GitHub.",
    };
  }
}

export async function getUserProjects(userId: string): Promise<Project[]> {
  const prisma = getPrisma();
  if (!prisma) return [];

  try {
    const records = await prisma.project.findMany({
      where: { userId },
      include: { repository: true },
      orderBy: { createdAt: "desc" },
    });

    return records.map((record) => ({
      id: record.id,
      name: record.name,
      description: record.description,
      language: record.language,
      status: record.status as AnalysisStatus,
      createdAt: record.createdAt.toISOString(),
      repository: {
        owner: record.repository.owner,
        name: record.repository.name,
        fullName: record.repository.fullName,
        description: record.repository.description,
        language: record.repository.language,
        visibility: record.repository.visibility,
        stars: record.repository.stars,
        url: record.repository.url,
        defaultBranch: record.repository.defaultBranch,
        updatedAt: record.repository.updatedAt.toISOString(),
      },
    }));
  } catch {
    return [];
  }
}