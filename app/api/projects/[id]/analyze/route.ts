import { NextRequest, NextResponse } from "next/server";

import { startAnalysis } from "@/lib/analyzer";
import { getSessionUserId } from "@/lib/auth";
import { getPrisma } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
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

  const project = await prisma.project.findFirst({ where: { id, userId } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  await prisma.project.update({ where: { id }, data: { status: "QUEUED" } });
  startAnalysis(id);

  return NextResponse.json({ projectId: id, status: "QUEUED" });
}