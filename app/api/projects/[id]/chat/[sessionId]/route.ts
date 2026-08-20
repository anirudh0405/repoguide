import { NextRequest, NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";
import { getPrisma } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string; sessionId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id, sessionId } = await context.params;
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

  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, projectId: id, userId },
  });
  if (!session) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    session: {
      id: session.id,
      title: session.title,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    },
    messages: messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      sources: message.sources as string[] | null,
      createdAt: message.createdAt.toISOString(),
    })),
  });
}