import { NextRequest, NextResponse } from "next/server";

import { isAIConfigured } from "@/lib/ai/ai-provider";
import { ChatError, answerChatQuestion } from "@/lib/ai/chat";
import { isEmbeddingConfigured } from "@/lib/ai/embedding-provider";
import { getSessionUserId } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { checkAiQuestionLimit, recordAiQuestion } from "@/lib/usage";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const MAX_QUESTION_LENGTH = 2000;
const HISTORY_LIMIT = 10;

function serializeIndex(index: {
  status: string;
  step: string | null;
  error: string | null;
  chunkCount: number;
  model: string | null;
  commitSha: string | null;
  updatedAt: Date;
} | null) {
  return index
    ? {
        status: index.status,
        step: index.step,
        error: index.error,
        chunkCount: index.chunkCount,
        model: index.model,
        commitSha: index.commitSha,
        updatedAt: index.updatedAt.toISOString(),
      }
    : null;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
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

  const [index, analysis, sessions] = await Promise.all([
    prisma.codeIndex.findUnique({ where: { projectId: id } }),
    prisma.analysis.findFirst({
      where: { projectId: id, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
    }),
    prisma.chatSession.findMany({
      where: { projectId: id, userId },
      include: { _count: { select: { messages: true } } },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      repository: {
        owner: project.repository.owner,
        name: project.repository.name,
        fullName: project.repository.fullName,
        defaultBranch: project.repository.defaultBranch,
      },
    },
    analysis: analysis
      ? { id: analysis.id, status: analysis.status, commitSha: analysis.commitSha }
      : null,
    index: serializeIndex(index),
    configured: isAIConfigured() && isEmbeddingConfigured(),
    sessions: sessions.map((session) => ({
      id: session.id,
      title: session.title,
      messageCount: session._count.messages,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
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

  if (!isAIConfigured() || !isEmbeddingConfigured()) {
    return NextResponse.json(
      { error: "AI chat is not configured. Add NVIDIA_API_KEY to the server environment." },
      { status: 503 }
    );
  }

  let body: { sessionId?: string; question?: unknown };
  try {
    body = (await request.json()) as { sessionId?: string; question?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (question.length === 0) {
    return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { error: `Questions must be ${MAX_QUESTION_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  const index = await prisma.codeIndex.findUnique({ where: { projectId: id } });
  if (!index || index.status !== "COMPLETED" || index.chunkCount === 0) {
    return NextResponse.json(
      { error: "This repository hasn't been indexed yet. Index it before asking questions." },
      { status: 409 }
    );
  }

  // Check AI question limit before proceeding.
  const limitCheck = await checkAiQuestionLimit(userId);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: limitCheck.reason ?? "You've reached your monthly AI question limit." },
      { status: 429 }
    );
  }

  // Resolve (or create) the session, always scoped to this user + project.
  let session;
  if (body.sessionId) {
    session = await prisma.chatSession.findFirst({
      where: { id: body.sessionId, projectId: id, userId },
    });
    if (!session) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
  } else {
    session = await prisma.chatSession.create({
      data: {
        projectId: id,
        userId,
        title: question.slice(0, 60),
      },
    });
  }

  await prisma.chatMessage.create({
    data: { sessionId: session.id, role: "user", content: question },
  });

  const prior = await prisma.chatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  });
  const history = prior
    .reverse()
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({ role: message.role, content: message.content }));

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown): void => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Client disconnected — stop streaming.
        }
      };

      try {
        const result = await answerChatQuestion({
          projectId: id,
          question,
          history: history.filter((turn) => turn.content.length > 0) as {
            role: "user" | "assistant";
            content: string;
          }[],
          onToken: (delta) => send("token", { delta }),
        });

        const assistant = await prisma.chatMessage.create({
          data: {
            sessionId: session.id,
            role: "assistant",
            content: result.answer,
            ...(result.sources.length > 0 ? { sources: result.sources } : {}),
          },
        });
        await prisma.chatSession.update({
          where: { id: session.id },
          data: { updatedAt: new Date() },
        });

        // Record AI question usage (estimate tokens from answer length).
        const estimatedTokens = Math.ceil((question.length + result.answer.length) / 4);
        await recordAiQuestion(userId, estimatedTokens);

        send("done", {
          messageId: assistant.id,
          sessionId: session.id,
          sources: result.sources,
          answer: result.answer,
        });
      } catch (error) {
        console.error("[chat] failed:", error);
        send("error", { error: errorMessage(error) });
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

function errorMessage(error: unknown): string {
  if (error instanceof ChatError || error instanceof Error) return error.message;
  return "Could not answer that question. Try again in a moment.";
}