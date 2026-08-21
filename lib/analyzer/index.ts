import "server-only";

import { startIndexing } from "@/lib/ai/indexer";
import {
  detectDependencies,
  detectEntryPoints,
  detectFrameworks,
  detectImportantFiles,
  detectPackageManagers,
} from "@/lib/analyzer/detection";
import {
  createTempDir,
  downloadAndExtract,
  ingestFiles,
  IngestError,
  removeTempDir,
} from "@/lib/analyzer/ingest";
import { buildDirectoryTree } from "@/lib/analyzer/tree";
import { getPrisma } from "@/lib/db";
import { getCommitSha, getFreshUserAccessToken, GitHubError } from "@/lib/github";
import type { AnalysisPhase, AnalysisSummary } from "@/lib/types";

export const ACTIVE_STATUSES = new Set<AnalysisPhase>([
  "QUEUED",
  "DOWNLOADING",
  "PARSING",
  "ANALYZING",
]);

export function isActiveStatus(status: string): boolean {
  return ACTIVE_STATUSES.has(status as AnalysisPhase);
}

export async function runAnalysis(projectId: string): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) return;

  let analysisId: string | null = null;
  let tempDir: string | null = null;
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { repository: true },
    });
    if (!project) return;

    const analysis = await prisma.analysis.create({
      data: { projectId, status: "QUEUED", startedAt: new Date() },
    });
    analysisId = analysis.id;

    const setStatus = async (
      status: AnalysisPhase,
      step?: string | null,
      error?: string | null
    ): Promise<void> => {
      await prisma.analysis.update({
        where: { id: analysis.id },
        data: {
          status,
          step: step ?? null,
          error: error ?? null,
          ...(status === "COMPLETED" || status === "FAILED" ? { completedAt: new Date() } : {}),
        },
      });
      await prisma.project.update({ where: { id: projectId }, data: { status } });
    };

    // Clear prior results so re-runs are idempotent.
    await prisma.sourceFile.deleteMany({ where: { projectId } });
    await prisma.dependency.deleteMany({ where: { projectId } });

    const account = await prisma.gitHubAccount.findUnique({ where: { userId: project.userId } });
    if (!account || !account.accessToken) {
      throw new Error("Your GitHub account is no longer connected. Reconnect and try again.");
    }
    const userToken = await getFreshUserAccessToken(account);

    const repo = project.repository;
    const defaultBranch = repo.defaultBranch || "main";

    await setStatus("DOWNLOADING", `Downloading ${repo.fullName} from the ${defaultBranch} branch…`);
    tempDir = await createTempDir();
    const rootDir = await downloadAndExtract(repo.owner, repo.name, defaultBranch, tempDir, userToken);

    await setStatus("PARSING", "Discovering files…");
    const files = await ingestFiles(rootDir);
    if (files.length === 0) {
      throw new Error("No source files found after applying ignore rules and size limits.");
    }

    await prisma.sourceFile.createMany({
      data: files.map((file) => ({
        projectId,
        path: file.path,
        name: file.name,
        extension: file.extension,
        language: file.language,
        size: file.size,
        lineCount: file.lineCount,
        hash: file.hash,
        directory: file.directory,
      })),
      skipDuplicates: true,
    });

    await setStatus("ANALYZING", "Detecting languages, frameworks, and dependencies…");

    const byPath = new Map(files.map((file) => [file.path, file]));
    const [frameworks, packageManagers, entryPoints, importantFiles, dependencies] =
      await Promise.all([
        detectFrameworks(files),
        Promise.resolve(detectPackageManagers(files)),
        detectEntryPoints(files, byPath),
        Promise.resolve(detectImportantFiles(files)),
        detectDependencies(files, byPath),
      ]);

    if (dependencies.length > 0) {
      await prisma.dependency.createMany({
        data: dependencies.map((dep) => ({
          projectId,
          name: dep.name,
          version: dep.version,
          type: dep.type,
          scope: dep.scope,
        })),
        skipDuplicates: true,
      });
    }

    const lineCount = files.reduce((sum, file) => sum + file.lineCount, 0);
    const languages: Record<string, { files: number; lines: number }> = {};
    for (const file of files) {
      const lang = file.language ?? "Other";
      const current = languages[lang] ?? { files: 0, lines: 0 };
      current.files += 1;
      current.lines += file.lineCount;
      languages[lang] = current;
    }

    const summary: AnalysisSummary = {
      fileCount: files.length,
      lineCount,
      languages,
      frameworks,
      packageManagers,
      importantFiles,
      entryPoints,
      directoryTree: buildDirectoryTree(files.map((file) => file.path)),
      defaultBranch,
    };

    // Record the exact commit that was analyzed. Onboarding guides are tied to
    // this SHA so a guide is only reused while the code hasn't changed.
    const commitSha = await getCommitSha(userToken, repo.owner, repo.name, defaultBranch);

    await prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        summary: JSON.parse(JSON.stringify(summary)),
        commitSha,
      },
    });

    await setStatus("COMPLETED", "Building project structure…");

    // Phase 5: kick off semantic indexing in the background so the repository
    // is ready for codebase Q&A shortly after analysis finishes.
    startIndexing(projectId);
  } catch (error) {
    const message =
      error instanceof GitHubError || error instanceof IngestError || error instanceof Error
        ? error.message
        : "Analysis failed unexpectedly.";
    console.error("[analysis] failed:", error);
    if (analysisId) {
      await prisma.analysis
        .update({
          where: { id: analysisId },
          data: { status: "FAILED", error: message, completedAt: new Date() },
        })
        .catch(() => {});
    }
    await prisma.project.update({ where: { id: projectId }, data: { status: "FAILED" } }).catch(() => {});
  } finally {
    if (tempDir) {
      await removeTempDir(tempDir);
    }
  }
}

// Kick off an analysis without blocking the request that queued it.
export function startAnalysis(projectId: string): void {
  void runAnalysis(projectId);
}