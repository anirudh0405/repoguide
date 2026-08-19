import { NextRequest, NextResponse } from "next/server";

import { isBinaryExtension } from "@/lib/analyzer/languages";
import { getSessionUserId } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { getFreshUserAccessToken } from "@/lib/github";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const MAX_DISPLAY_BYTES = 512 * 1024; // don't ship megabytes of code to the browser

export async function GET(request: NextRequest, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const path = request.nextUrl.searchParams.get("path");
  if (!path || path.includes("..")) {
    return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
  }

  const { id } = await context.params;
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  }

  const project = await prisma.project.findFirst({
    where: { id, userId },
    include: { repository: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const sourceFile = await prisma.sourceFile.findUnique({
    where: { projectId_path: { projectId: id, path } },
  });
  if (!sourceFile) {
    return NextResponse.json({ error: "File not found in this project" }, { status: 404 });
  }

  const account = await prisma.gitHubAccount.findUnique({ where: { userId } });
  if (!account || !account.accessToken) {
    return NextResponse.json({ error: "GitHub account is not connected" }, { status: 401 });
  }

  const analysis = await prisma.analysis.findFirst({
    where: { projectId: id, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
  });
  const ref = analysis?.commitSha ?? project.repository.defaultBranch;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const url = `https://raw.githubusercontent.com/${project.repository.owner}/${project.repository.name}/${ref}/${encodedPath}`;

  const userToken = await getFreshUserAccessToken(account);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${userToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });

  if (response.status === 404) {
    return NextResponse.json({ error: "File is not available at this commit" }, { status: 404 });
  }
  if (!response.ok) {
    return NextResponse.json({ error: "Could not fetch the file from GitHub" }, { status: 502 });
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const binary = isBinaryExtension(sourceFile.extension) || buffer.includes(0);
  if (binary) {
    return NextResponse.json({
      path: sourceFile.path,
      name: sourceFile.name,
      language: sourceFile.language,
      size: sourceFile.size,
      lineCount: sourceFile.lineCount,
      content: null,
      note: "This is a binary file and can't be previewed.",
    });
  }

  const truncated = buffer.length > MAX_DISPLAY_BYTES;
  const content = buffer.subarray(0, MAX_DISPLAY_BYTES).toString("utf8");

  return NextResponse.json({
    path: sourceFile.path,
    name: sourceFile.name,
    language: sourceFile.language,
    size: sourceFile.size,
    lineCount: sourceFile.lineCount,
    content,
    truncated,
  });
}