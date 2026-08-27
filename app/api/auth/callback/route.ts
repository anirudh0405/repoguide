import { NextRequest, NextResponse } from "next/server";

import {
  OAUTH_NEXT_COOKIE,
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  encodeSession,
  sessionCookieOptions,
} from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import {
  exchangeCodeForToken,
  getAuthenticatedUser,
  isGitHubConfigured,
  syncInstallations,
} from "@/lib/github";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const setupAction = searchParams.get("setup_action");

  console.log("[auth/callback] Received:", { code: !!code, state: !!state, setupAction, cookies: request.cookies.getAll().map(c => c.name) });

  if (!isGitHubConfigured()) {
    console.error("[auth/callback] GitHub not configured");
    return NextResponse.redirect(new URL("/?auth=not_configured", request.url));
  }

  // GitHub App installation callback: no authorization code, just the
  // installation confirmation.
  if (!code) {
    if (setupAction === "install") {
      console.log("[auth/callback] First-time install, restarting OAuth");
      return NextResponse.redirect(new URL("/api/auth/github?next=/repositories", request.url));
    }
    console.log("[auth/callback] Installation callback, redirecting to repositories");
    return NextResponse.redirect(new URL("/repositories?installed=1", request.url));
  }

  // Verify the OAuth state parameter to prevent CSRF.
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  console.log("[auth/callback] State check:", { expectedState: !!expectedState, stateMatch: state === expectedState });
  if (!state || !expectedState || state !== expectedState) {
    console.error("[auth/callback] State mismatch", { state, expectedState });
    return NextResponse.redirect(new URL("/?auth=error&reason=state_mismatch", request.url));
  }

  const nextTarget = request.cookies.get(OAUTH_NEXT_COOKIE)?.value ?? "/repositories";
  const safeNext =
    nextTarget.startsWith("/") && !nextTarget.startsWith("//") ? nextTarget : "/repositories";

  try {
    console.log("[auth/callback] Exchanging code for token");
    const token = await exchangeCodeForToken(code);
    console.log("[auth/callback] Got token, fetching user");
    const githubUser = await getAuthenticatedUser(token.accessToken);
    console.log("[auth/callback] Got GitHub user:", githubUser.login);

    const prisma = getPrisma();
    if (!prisma) {
      console.error("[auth/callback] Database not configured");
      return NextResponse.redirect(new URL("/?auth=db_required", request.url));
    }

    console.log("[auth/callback] Upserting user");
    const user = await prisma.user.upsert({
      where: { githubId: githubUser.id },
      create: {
        githubId: githubUser.id,
        email: githubUser.email,
        name: githubUser.name ?? githubUser.login,
        avatarUrl: githubUser.avatar_url,
        account: {
          create: {
            githubId: githubUser.id,
            login: githubUser.login,
            name: githubUser.name,
            email: githubUser.email,
            avatarUrl: githubUser.avatar_url,
            accessToken: token.accessToken,
            refreshToken: token.refreshToken,
            accessTokenExpiresAt: token.expiresAt,
          },
        },
      },
      update: {
        email: githubUser.email,
        name: githubUser.name ?? githubUser.login,
        avatarUrl: githubUser.avatar_url,
        account: {
          upsert: {
            create: {
              githubId: githubUser.id,
              login: githubUser.login,
              name: githubUser.name,
              email: githubUser.email,
              avatarUrl: githubUser.avatar_url,
              accessToken: token.accessToken,
              refreshToken: token.refreshToken,
              accessTokenExpiresAt: token.expiresAt,
            },
            update: {
              accessToken: token.accessToken,
              refreshToken: token.refreshToken,
              accessTokenExpiresAt: token.expiresAt,
            },
          },
        },
      },
    });
    console.log("[auth/callback] User upserted:", user.id);

    // Record the GitHub App installations this user can access.
    try {
      await syncInstallations(user.id, token.accessToken);
    } catch {
      // Non-fatal: installations are re-synced lazily on the repositories page.
    }

    console.log("[auth/callback] Setting session cookie");
    const response = NextResponse.redirect(new URL(safeNext, request.url));
    response.cookies.set(SESSION_COOKIE, encodeSession(user.id), sessionCookieOptions());
    response.cookies.delete(OAUTH_STATE_COOKIE);
    response.cookies.delete(OAUTH_NEXT_COOKIE);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[auth/callback] Failed:", message);
    // Add more context to the redirect for debugging
    return NextResponse.redirect(new URL(`/?auth=error&reason=${encodeURIComponent(message.slice(0, 100))}`, request.url));
  }
}