import "server-only";

import crypto from "node:crypto";

import { getPrisma } from "@/lib/db";

const GITHUB_API = "https://api.github.com";
const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_OAUTH_URL = "https://github.com/login/oauth/access_token";
const USER_AGENT = "RepoGuide";
const TOKEN_TTL_SECONDS = 8 * 60 * 60;

export class GitHubError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export function isGitHubConfigured(): boolean {
  return Boolean(
    process.env.GITHUB_APP_ID &&
      process.env.GITHUB_CLIENT_ID &&
      process.env.GITHUB_CLIENT_SECRET &&
      process.env.GITHUB_PRIVATE_KEY
  );
}

function requireGitHubConfig() {
  if (!isGitHubConfigured()) {
    throw new GitHubError("GitHub App credentials are not configured", 503);
  }
}

function getPrivateKey(): string {
  const raw = process.env.GITHUB_PRIVATE_KEY ?? "";
  const pem = raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
  const trimmed = pem.trim();
  if (!trimmed.includes("-----BEGIN")) {
    throw new GitHubError("GITHUB_PRIVATE_KEY is not a valid PEM private key", 503);
  }
  return trimmed;
}

function base64Url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

export function createAppJwt(): string {
  requireGitHubConfig();
  const appId = process.env.GITHUB_APP_ID!;
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = { iss: appId, iat: now - 60, exp: now + 540 };
  const headerB64 = base64Url(JSON.stringify(header));
  const payloadB64 = base64Url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = crypto.createPrivateKey(getPrivateKey());
  const signature = crypto.sign("sha256", Buffer.from(signingInput), key);
  return `${signingInput}.${base64Url(signature)}`;
}

interface GitHubRequestOptions {
  token?: string;
  jwt?: string;
  method?: string;
  body?: unknown;
}

async function githubFetch(path: string, options: GitHubRequestOptions = {}): Promise<unknown> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": USER_AGENT,
  };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.jwt) headers.Authorization = `Bearer ${options.jwt}`;

  const response = await fetch(`${GITHUB_API}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  let data: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String((data as { message: unknown }).message)
        : `GitHub API request failed with status ${response.status}`;
    throw new GitHubError(message, response.status);
  }

  return data;
}

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

export interface GitHubInstallationInfo {
  id: number;
  account: { id: number; login: string; type: string };
  repository_selection: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  description: string | null;
  language: string | null;
  visibility: string;
  private: boolean;
  stargazers_count: number;
  forks_count: number;
  pushed_at: string | null;
  updated_at: string | null;
  default_branch: string;
  html_url: string;
}

export interface GitHubAppInfo {
  slug: string;
  html_url: string;
}

// --- OAuth web flow (user authorization) ---

export function getAuthorizeUrl(state: string, redirectUri: string): string {
  requireGitHubConfig();
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: redirectUri,
    state,
  });
  return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
}

export interface TokenResult {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
}

async function oauthTokenRequest(body: Record<string, string>): Promise<TokenResult> {
  requireGitHubConfig();
  const response = await fetch(GITHUB_OAUTH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      ...body,
    }),
    cache: "no-store",
  });
  const data = (await response.json()) as {
    error?: string;
    error_description?: string;
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!response.ok || data.error || !data.access_token) {
    throw new GitHubError(
      data.error_description || data.error || "GitHub token request failed",
      response.status
    );
  }

  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : TOKEN_TTL_SECONDS;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  };
}

export async function exchangeCodeForToken(code: string): Promise<TokenResult> {
  return oauthTokenRequest({ code });
}

export async function refreshUserAccessToken(refreshToken: string): Promise<TokenResult> {
  return oauthTokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
}

// --- GitHub API calls ---

export async function getAuthenticatedUser(accessToken: string): Promise<GitHubUser> {
  return (await githubFetch("/user", { token: accessToken })) as GitHubUser;
}

export async function getUserInstallations(accessToken: string): Promise<GitHubInstallationInfo[]> {
  const installations: GitHubInstallationInfo[] = [];
  let page = 1;
  while (true) {
    const data = (await githubFetch(`/user/installations?per_page=100&page=${page}`, {
      token: accessToken,
    })) as { installations?: GitHubInstallationInfo[] };
    const batch = data.installations ?? [];
    installations.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return installations;
}

export async function getAppInfo(): Promise<GitHubAppInfo> {
  requireGitHubConfig();
  return (await githubFetch("/app", { jwt: createAppJwt() })) as GitHubAppInfo;
}

export async function getInstallationRepositories(
  installationToken: string
): Promise<GitHubRepo[]> {
  const repositories: GitHubRepo[] = [];
  let page = 1;
  while (true) {
    const data = (await githubFetch(`/installation/repositories?per_page=100&page=${page}`, {
      token: installationToken,
    })) as { repositories?: GitHubRepo[] };
    const batch = data.repositories ?? [];
    repositories.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return repositories;
}

export async function getRepository(
  installationToken: string,
  repoId: number
): Promise<GitHubRepo> {
  return (await githubFetch(`/repositories/${repoId}`, { token: installationToken })) as GitHubRepo;
}

// Installation access tokens are short-lived and never persisted. They are
// cached in memory only for the lifetime of a single server process and a
// fresh token is generated whenever the cache is cold or expired.
const installationTokenCache = new Map<number, { token: string; expiresAt: number }>();

export async function getInstallationAccessToken(
  installationId: number,
  options: { force?: boolean } = {}
): Promise<string> {
  const cached = installationTokenCache.get(installationId);
  if (!options.force && cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  requireGitHubConfig();
  const data = (await githubFetch(`/app/installations/${installationId}/access_tokens`, {
    jwt: createAppJwt(),
    method: "POST",
  })) as { token: string; expires_at?: string };

  const expiresAt = data.expires_at
    ? new Date(data.expires_at).getTime()
    : Date.now() + 60 * 60 * 1000;
  installationTokenCache.set(installationId, { token: data.token, expiresAt });
  return data.token;
}

// --- Account token management ---

export interface AccountTokenContext {
  id: string;
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: Date | null;
}

export async function getFreshUserAccessToken(account: AccountTokenContext): Promise<string> {
  if (!account.accessToken) {
    throw new GitHubError("GitHub account is not connected", 401);
  }
  const expiresAt = account.accessTokenExpiresAt
    ? new Date(account.accessTokenExpiresAt).getTime()
    : 0;
  const nearExpiry = expiresAt < Date.now() + 5 * 60 * 1000;
  if (!nearExpiry) return account.accessToken;

  if (!account.refreshToken) {
    throw new GitHubError(
      "GitHub access has expired. Disconnect and reconnect your GitHub account.",
      401
    );
  }

  const refreshed = await refreshUserAccessToken(account.refreshToken);
  const prisma = getPrisma();
  if (prisma) {
    await prisma.gitHubAccount
      .update({
        where: { id: account.id },
        data: {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          accessTokenExpiresAt: refreshed.expiresAt,
        },
      })
      .catch(() => {
        // Best-effort persistence; the in-memory result is returned below.
      });
  }
  return refreshed.accessToken;
}

// Sync GitHub App installations the user can access into the database.
export async function syncInstallations(userId: string, userToken: string): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) return;
  const installations = await getUserInstallations(userToken);
  for (const installation of installations) {
    await prisma.gitHubInstallation.upsert({
      where: { githubId: installation.id },
      create: {
        githubId: installation.id,
        accountId: installation.account.id,
        accountLogin: installation.account.login,
        accountType: installation.account.type,
        repositorySelection: installation.repository_selection,
        userId,
      },
      update: {
        repositorySelection: installation.repository_selection,
        accountLogin: installation.account.login,
      },
    });
  }
}