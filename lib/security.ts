import "server-only";

import { getPrisma } from "@/lib/db";

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  "/api/auth/github": { windowMs: 10 * 60 * 1000, maxRequests: 10 }, // 10 per 10 min
  "/api/auth/callback": { windowMs: 10 * 60 * 1000, maxRequests: 20 }, // 20 per 10 min
  "/api/projects": { windowMs: 60 * 1000, maxRequests: 10 }, // 10 per minute
  "/api/projects/[id]/analyze": { windowMs: 60 * 1000, maxRequests: 5 }, // 5 per minute
  "/api/projects/[id]/reanalyze": { windowMs: 60 * 1000, maxRequests: 5 }, // 5 per minute
  "/api/projects/[id]/chat": { windowMs: 60 * 1000, maxRequests: 30 }, // 30 per minute
  "/api/projects/[id]/documentation": { windowMs: 60 * 1000, maxRequests: 5 }, // 5 per minute
  "/api/projects/[id]/index": { windowMs: 60 * 1000, maxRequests: 5 }, // 5 per minute
  "/api/projects/[id]/architecture": { windowMs: 60 * 1000, maxRequests: 5 }, // 5 per minute
  "/api/billing/checkout": { windowMs: 60 * 1000, maxRequests: 5 }, // 5 per minute
  "/api/onboarding": { windowMs: 60 * 1000, maxRequests: 20 }, // 20 per minute
};

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  endpoint: string
): { allowed: boolean; remaining: number; resetAt: number } {
  const config = RATE_LIMITS[endpoint] ?? { windowMs: 60 * 1000, maxRequests: 60 };
  const now = Date.now();
  const key = `${identifier}:${endpoint}`;

  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
  return ip;
}

export async function verifyProjectAccess(userId: string, projectId: string): Promise<boolean> {
  const prisma = getPrisma();
  if (!prisma) return false;

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });

  return !!project;
}

export async function verifyRepositoryAccess(
  userId: string,
  repositoryId: string
): Promise<boolean> {
  const prisma = getPrisma();
  if (!prisma) return false;

  const project = await prisma.project.findFirst({
    where: { repositoryId, userId },
    select: { id: true },
  });

  return !!project;
}

export function sanitizeInput(input: string, maxLength: number = 10000): string {
  if (typeof input !== "string") return "";
  return input.slice(0, maxLength).replace(/[\x00-\x1F\x7F]/g, "");
}

export function validateGitHubRepoName(name: string): boolean {
  return /^[a-zA-Z0-9._-]+$/i.test(name) && name.length <= 100;
}

export function validateGitHubOwnerName(name: string): boolean {
  return /^[a-zA-Z0-9-]+$/i.test(name) && name.length <= 39;
}

export function validateProjectId(id: string): boolean {
  return /^[a-z0-9]{25}$/i.test(id);
}