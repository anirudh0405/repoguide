import "server-only";

import { getPrisma } from "@/lib/db";
import { getPlanLimits, type PlanName } from "@/lib/config/plans";

export type UsageMetric = 
  | "repositoriesAnalyzed"
  | "aiQuestions"
  | "tokensConsumed"
  | "storageUsedBytes"
  | "analysisRuns";

export interface UsageInfo {
  current: {
    repositoriesAnalyzed: number;
    aiQuestions: number;
    tokensConsumed: number;
    storageUsedBytes: number;
    analysisRuns: number;
  };
  limits: {
    maxRepositories: number;
    maxAiQuestionsPerMonth: number;
    maxTokensPerMonth: number;
    maxStorageBytes: number;
    maxRepositorySizeBytes: number;
  };
  plan: PlanName;
  canAnalyzeRepository: boolean;
  canAskAiQuestion: boolean;
  canStoreMore: boolean;
}

export async function getCurrentPeriodBounds(): Promise<{ periodStart: Date; periodEnd: Date }> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { periodStart, periodEnd };
}

export async function getOrCreateUsageRecord(userId: string) {
  const prisma = getPrisma();
  if (!prisma) return null;

  const { periodStart, periodEnd } = await getCurrentPeriodBounds();

  const record = await prisma.usageRecord.upsert({
    where: {
      userId_periodStart: {
        userId,
        periodStart,
      },
    },
    create: {
      userId,
      periodStart,
      periodEnd,
      repositoriesAnalyzed: 0,
      aiQuestions: 0,
      tokensConsumed: 0,
      storageUsedBytes: 0,
      analysisRuns: 0,
    },
    update: {},
  });

  return record;
}

export async function incrementUsage(
  userId: string,
  metric: UsageMetric,
  amount: number = 1
): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) return;

  const { periodStart } = await getCurrentPeriodBounds();

  const updateData: Record<string, { increment: number }> = {};
  updateData[metric] = { increment: amount };

  await prisma.usageRecord.upsert({
    where: {
      userId_periodStart: {
        userId,
        periodStart,
      },
    },
    create: {
      userId,
      periodStart,
      periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
      ...Object.fromEntries(
        (["repositoriesAnalyzed", "aiQuestions", "tokensConsumed", "storageUsedBytes", "analysisRuns"] as UsageMetric[]).map(m => [
          m,
          m === metric ? amount : 0
        ])
      ),
    },
    update: updateData,
  });
}

export async function getUsageInfo(userId: string): Promise<UsageInfo | null> {
  const prisma = getPrisma();
  if (!prisma) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  if (!user) return null;

  const plan = user.plan as PlanName;
  const limits = getPlanLimits(plan);

  const { periodStart } = await getCurrentPeriodBounds();
  const usageRecord = await prisma.usageRecord.findUnique({
    where: {
      userId_periodStart: {
        userId,
        periodStart,
      },
    },
  });

  const current = {
    repositoriesAnalyzed: usageRecord?.repositoriesAnalyzed ?? 0,
    aiQuestions: usageRecord?.aiQuestions ?? 0,
    tokensConsumed: usageRecord?.tokensConsumed ?? 0,
    storageUsedBytes: Number(usageRecord?.storageUsedBytes ?? 0),
    analysisRuns: usageRecord?.analysisRuns ?? 0,
  };

  return {
    current,
    limits: {
      maxRepositories: limits.maxRepositories,
      maxAiQuestionsPerMonth: limits.maxAiQuestionsPerMonth,
      maxTokensPerMonth: limits.maxTokensPerMonth,
      maxStorageBytes: limits.maxStorageBytes,
      maxRepositorySizeBytes: limits.maxRepositorySizeBytes,
    },
    plan,
    canAnalyzeRepository: current.repositoriesAnalyzed < limits.maxRepositories,
    canAskAiQuestion: current.aiQuestions < limits.maxAiQuestionsPerMonth,
    canStoreMore: current.storageUsedBytes < limits.maxStorageBytes,
  };
}

export async function checkRepositoryLimit(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const usage = await getUsageInfo(userId);
  if (!usage) return { allowed: false, reason: "Could not verify usage limits" };

  if (!usage.canAnalyzeRepository) {
    return {
      allowed: false,
      reason: `Repository limit reached (${usage.current.repositoriesAnalyzed}/${usage.limits.maxRepositories}). Upgrade to Pro for more.`,
    };
  }
  return { allowed: true };
}

export async function checkAiQuestionLimit(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const usage = await getUsageInfo(userId);
  if (!usage) return { allowed: false, reason: "Could not verify usage limits" };

  if (!usage.canAskAiQuestion) {
    return {
      allowed: false,
      reason: `AI question limit reached (${usage.current.aiQuestions}/${usage.limits.maxAiQuestionsPerMonth} this month). Upgrade to Pro for more.`,
    };
  }
  return { allowed: true };
}

export async function checkRepositorySizeLimit(userId: string, sizeBytes: number): Promise<{ allowed: boolean; reason?: string }> {
  const usage = await getUsageInfo(userId);
  if (!usage) return { allowed: false, reason: "Could not verify usage limits" };

  if (sizeBytes > usage.limits.maxRepositorySizeBytes) {
    return {
      allowed: false,
      reason: `Repository too large (${Math.round(sizeBytes / 1024 / 1024)} MB). Maximum allowed on ${usage.plan} plan: ${Math.round(usage.limits.maxRepositorySizeBytes / 1024 / 1024)} MB.`,
    };
  }
  return { allowed: true };
}

export async function recordRepositoryAnalyzed(userId: string): Promise<void> {
  await incrementUsage(userId, "repositoriesAnalyzed");
  await incrementUsage(userId, "analysisRuns");
}

export async function recordAiQuestion(userId: string, tokens: number): Promise<void> {
  await incrementUsage(userId, "aiQuestions");
  await incrementUsage(userId, "tokensConsumed", tokens);
}

export async function recordStorageUsed(userId: string, bytes: number): Promise<void> {
  await incrementUsage(userId, "storageUsedBytes", bytes);
}