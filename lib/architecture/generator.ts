// Architecture graph generator — runs after a repository analysis, downloads
// the analyzed commit, scans it statically (imports, routes, packages,
// configuration), and stores the resulting evidence-backed graph. Mirrors the
// onboarding-guide job pattern: a GENERATING row is created by the API route
// first, then this runner fills it in. No AI is involved.

import {
  createTempDir,
  downloadAndExtract,
  removeTempDir,
} from "@/lib/analyzer/ingest";
import { ingestFiles } from "@/lib/analyzer/ingest";
import { buildArchitectureModel } from "@/lib/architecture/build";
import type { ArchitectureModel, ArchitectureStep } from "@/lib/architecture/types";
import { getPrisma } from "@/lib/db";
import { getFreshUserAccessToken } from "@/lib/github";

export type { ArchitectureStatus } from "@/lib/architecture/types";

export async function runArchitectureGraph(projectId: string): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) return;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { repository: true },
  });
  if (!project) return;

  const analysis = await prisma.analysis.findFirst({
    where: { projectId, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
  });

  const graph = await prisma.architectureGraph.findFirst({
    where: { projectId, status: "GENERATING" },
    orderBy: { createdAt: "desc" },
  });
  if (!graph) return;

  const setStep = (step: ArchitectureStep): Promise<unknown> =>
    prisma.architectureGraph.update({ where: { id: graph.id }, data: { step } });

  const markFailed = (error: unknown): Promise<unknown> =>
    prisma.architectureGraph.update({
      where: { id: graph.id },
      data: { status: "FAILED", step: null, error: errorMessage(error) },
    });

  let tempDir: string | null = null;
  try {
    if (!analysis?.summary) {
      throw new Error("The repository has not been analyzed yet. Run the analysis first.");
    }
    await setStep("analysis-loaded");

    const account = await prisma.gitHubAccount.findUnique({ where: { userId: project.userId } });
    if (!account || !account.accessToken) {
      throw new Error("Your GitHub account is no longer connected. Reconnect and try again.");
    }
    const userToken = await getFreshUserAccessToken(account);

    // Download the exact analyzed commit so the graph matches the analysis.
    const repo = project.repository;
    const ref = analysis.commitSha ?? repo.defaultBranch;
    tempDir = await createTempDir();
    await setStep("downloading");
    const rootDir = await downloadAndExtract(repo.owner, repo.name, ref, tempDir, userToken);

    await setStep("scanning");
    const files = await ingestFiles(rootDir);

    await setStep("mapping");

    const readFile = async (path: string): Promise<string | null> => {
      try {
        const { readFile: readFileNode } = await import("node:fs/promises");
        return await readFileNode(`${rootDir}/${path}`, "utf8");
      } catch {
        return null;
      }
    };

    const model: ArchitectureModel = await buildArchitectureModel(files, {
      summary: analysis.summary as unknown as Parameters<typeof buildArchitectureModel>[1]["summary"],
      readFile,
    });
    await setStep("building");

    if (model.nodes.length === 0) {
      throw new Error(
        "No architecture components could be identified in this repository from static evidence."
      );
    }

    await prisma.architectureGraph.update({
      where: { id: graph.id },
      data: {
        status: "COMPLETED",
        step: null,
        error: null,
        commitSha: analysis.commitSha,
        analysisId: analysis.id,
        content: JSON.parse(JSON.stringify(model)),
      },
    });
  } catch (error) {
    console.error("[architecture-graph] failed:", error);
    await markFailed(error);
  } finally {
    if (tempDir) {
      await removeTempDir(tempDir);
    }
  }
}

export function startArchitectureGraph(projectId: string): void {
  void runArchitectureGraph(projectId);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Generating the architecture graph failed unexpectedly.";
}
