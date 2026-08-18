import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { OAUTH_NEXT_COOKIE, OAUTH_STATE_COOKIE, stateCookieOptions } from "@/lib/auth";
import { getAuthorizeUrl, isGitHubConfigured } from "@/lib/github";

export async function GET(request: NextRequest) {
  if (!isGitHubConfigured()) {
    return NextResponse.redirect(new URL("/?auth=not_configured", request.url));
  }

  const searchParams = request.nextUrl.searchParams;
  const next = searchParams.get("next");
  const safeNext =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/repositories";

  const state = crypto.randomBytes(24).toString("hex");
  const redirectUri = `${request.nextUrl.origin}/api/auth/callback`;

  const response = NextResponse.redirect(new URL(getAuthorizeUrl(state, redirectUri)));
  response.cookies.set(OAUTH_STATE_COOKIE, state, stateCookieOptions());
  response.cookies.set(OAUTH_NEXT_COOKIE, safeNext, stateCookieOptions());
  return response;
}