import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";

export async function DELETE(_request: NextRequest) {
  // Clear the session cookie to log the user out
  const response = NextResponse.json({ success: true });
  response.cookies.set("repoguide_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}