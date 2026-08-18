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

  if (!isGitHubConfigured()) {
    return NextResponse.redirect(new URL("/?auth=not_configured", request.url));
  }

  // GitHub App installation callback: no authorization code, just the
  // installation confirmation. Installations are re-synced from GitHub on the
  // repositories page, so a redirect is enough here.
  if (!code) {
    if (setupAction) {
      return NextResponse.redirect(new URL("/repositories?installed=1", request.url));
    }
    return NextResponse.redirect(new URL("/?auth=required", request.url));
  }

  // Verify the OAuth state parameter to prevent CSRF.
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/?auth=error", request.url));
  }

  const nextTarget = request.cookies.get(OAUTH_NEXT_COOKIE)?.value ?? "/repositories";
  const safeNext =
    nextTarget.startsWith("/") && !nextTarget.startsWith("//") ? nextTarget : "/repositories";

  try {
    const token = await exchangeCodeForToken(code);
    const githubUser = await getAuthenticatedUser(token.accessToken);

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.redirect(new URL("/?auth=db_required", request.url));
    }

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

    // Record the GitHub App installations this user can access.
    try {
      await syncInstallations(user.id, token.accessToken);
    } catch {
      // Non-fatal: installations are re-synced lazily on the repositories page.
    }

    const response = NextResponse.redirect(new URL(safeNext, request.url));
    response.cookies.set(SESSION_COOKIE, encodeSession(user.id), sessionCookieOptions());
    response.cookies.delete(OAUTH_STATE_COOKIE);
    response.cookies.delete(OAUTH_NEXT_COOKIE);
    return response;
  } catch (error) {
    console.error(
      "GitHub authorization callback failed:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.redirect(new URL("/?auth=error", request.url));
  }
}