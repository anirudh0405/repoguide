import { NextRequest, NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import {
  GitHubError,
  getFreshUserAccessToken,
  getInstallationAccessToken,
  getRepository,
  syncInstallations,
  type GitHubRepo,
} from "@/lib/github";

function repoToDb(repo: GitHubRepo) {
  return {
    githubId: repo.id,
    name: repo.name,
    owner: repo.owner.login,
    fullName: repo.full_name,
    description: repo.description,
    url: repo.html_url,
    language: repo.language,
    visibility: repo.private ? "private" : "public",
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    defaultBranch: repo.default_branch,
    updatedAt: new Date(repo.pushed_at ?? repo.updated_at ?? new Date().toISOString()),
  };
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let repositoryId: number;
  try {
    const body = (await request.json()) as { repositoryId?: unknown };
    repositoryId = Number(body.repositoryId);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!Number.isInteger(repositoryId) || repositoryId <= 0) {
    return NextResponse.json({ error: "repositoryId is required" }, { status: 400 });
  }

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  }

  try {
    const account = await prisma.gitHubAccount.findUnique({ where: { userId } });
    if (!account) {
      return NextResponse.json({ error: "Connect your GitHub account first" }, { status: 401 });
    }

    const userToken = await getFreshUserAccessToken(account);
    await syncInstallations(userId, userToken);

    const installations = await prisma.gitHubInstallation.findMany({ where: { userId } });
    if (installations.length === 0) {
      return NextResponse.json(
        { error: "Install the RepoGuide GitHub App to access repositories" },
        { status: 403 }
      );
    }

    // Find the repository across the user's installations. The installation ID
    // is never trusted from the client — membership is verified server-side.
    let matched: { repo: GitHubRepo; installationId: string } | null = null;
    for (const installation of installations) {
      const installationToken = await getInstallationAccessToken(installation.githubId);
      try {
        const repo = await getRepository(installationToken, repositoryId);
        matched = { repo, installationId: installation.id };
        break;
      } catch (error) {
        if (error instanceof GitHubError && error.status === 404) continue;
        throw error;
      }
    }

    if (!matched) {
      return NextResponse.json(
        { error: "This repository is not accessible through your GitHub App installation" },
        { status: 403 }
      );
    }

    const { repo, installationId } = matched;

    const repository = await prisma.repository.upsert({
      where: { githubId: repo.id },
      create: {
        ...repoToDb(repo),
        installationId,
      },
      update: {
        ...repoToDb(repo),
        installationId,
      },
    });

    const project = await prisma.project.upsert({
      where: { repositoryId: repository.id },
      create: {
        name: repo.name,
        description: repo.description,
        language: repo.language,
        status: "NOT_ANALYZED",
        repositoryId: repository.id,
        userId,
      },
      update: {},
    });

    return NextResponse.json({ projectId: project.id });
  } catch (error) {
    if (error instanceof GitHubError) {
      console.error("Project creation failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Project creation failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to connect repository" }, { status: 500 });
  }
}