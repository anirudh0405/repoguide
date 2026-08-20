import type { Metadata } from "next";
import Link from "next/link";
import { FolderGit2, MessageSquare } from "lucide-react";

import { AppShell } from "@/components/app-shell/app-shell";
import { ChatView } from "@/components/project/chat-view";
import { Button } from "@/components/ui/button";
import { isAIConfigured } from "@/lib/ai/ai-provider";
import { isEmbeddingConfigured } from "@/lib/ai/embedding-provider";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Codebase Q&A",
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;

  const prisma = getPrisma();
  let project = null;
  let analysis = null;
  let index = null;
  let sessions: {
    id: string;
    title: string | null;
    _count: { messages: number };
    createdAt: Date;
    updatedAt: Date;
  }[] = [];

  if (prisma) {
    try {
      project = await prisma.project.findFirst({
        where: { id, userId: user.id },
        include: { repository: true },
      });
      if (project) {
        [analysis, index, sessions] = await Promise.all([
          prisma.analysis.findFirst({
            where: { projectId: id, status: "COMPLETED" },
            orderBy: { completedAt: "desc" },
          }),
          prisma.codeIndex.findUnique({ where: { projectId: id } }),
          prisma.chatSession.findMany({
            where: { projectId: id, userId: user.id },
            include: { _count: { select: { messages: true } } },
            orderBy: { updatedAt: "desc" },
            take: 50,
          }),
        ]);
      }
    } catch {
      project = null;
    }
  }

  if (!project) {
    return (
      <AppShell title="Project not found" user={user}>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted/50">
            <FolderGit2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
              Project not found
            </h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              This project doesn&apos;t exist or belongs to another account.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  if (!analysis?.summary) {
    return (
      <AppShell title="Codebase Q&A" user={user}>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted/50">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
              Analyze this repository first
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Codebase Q&amp;A is built on the repository analysis. Run the analysis on the project
              page, then come back here.
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link href={`/projects/${id}`}>Go to project analysis</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const initial = {
    project: { id: project.id, name: project.name },
    analysis: analysis
      ? { id: analysis.id, status: analysis.status, commitSha: analysis.commitSha }
      : null,
    index: index
      ? {
          status: index.status as "INDEXING" | "COMPLETED" | "FAILED" | "EMPTY",
          step: index.step,
          error: index.error,
          chunkCount: index.chunkCount,
          model: index.model,
          commitSha: index.commitSha,
          updatedAt: index.updatedAt.toISOString(),
        }
      : null,
    configured: isAIConfigured() && isEmbeddingConfigured(),
    sessions: sessions.map((session) => ({
      id: session.id,
      title: session.title,
      messageCount: session._count.messages,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    })),
  };

  return (
    <AppShell title={`${project.repository.name} · Q&A`} user={user}>
      <ChatView projectId={project.id} initial={initial} />
    </AppShell>
  );
}