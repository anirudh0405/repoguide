import { NextRequest, NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";
import { getPrisma } from "@/lib/db";

export async function DELETE(_request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  }

  try {
    // Delete all user data (cascading deletes will handle related records)
    await prisma.user.delete({ where: { id: userId } });

    // Clear the session cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set("repoguide_session", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Account deletion failed:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}