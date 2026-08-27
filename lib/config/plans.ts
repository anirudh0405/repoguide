import "server-only";

export type PlanName = "FREE" | "PRO";

export interface PlanLimits {
  maxRepositories: number;
  maxAiQuestionsPerMonth: number;
  maxTokensPerMonth: number;
  maxStorageBytes: number;
  maxRepositorySizeBytes: number;
  autoReanalysis: boolean;
  advancedArchitecture: boolean;
  priorityQueue: boolean;
}

export const PLANS: Record<PlanName, PlanLimits> = {
  FREE: {
    maxRepositories: 1,
    maxAiQuestionsPerMonth: 10,
    maxTokensPerMonth: 50000,
    maxStorageBytes: 50 * 1024 * 1024, // 50 MB
    maxRepositorySizeBytes: 10 * 1024 * 1024, // 10 MB
    autoReanalysis: false,
    advancedArchitecture: false,
    priorityQueue: false,
  },
  PRO: {
    maxRepositories: 10,
    maxAiQuestionsPerMonth: 500,
    maxTokensPerMonth: 2000000,
    maxStorageBytes: 1024 * 1024 * 1024, // 1 GB
    maxRepositorySizeBytes: 100 * 1024 * 1024, // 100 MB
    autoReanalysis: true,
    advancedArchitecture: true,
    priorityQueue: true,
  },
};

export const PLAN_PRICES: Record<PlanName, { monthly: number; currency: string }> = {
  FREE: { monthly: 0, currency: "INR" },
  PRO: { monthly: 999, currency: "INR" },
};

export function getPlanLimits(plan: PlanName): PlanLimits {
  return PLANS[plan];
}

export function getPlanPrice(plan: PlanName): { monthly: number; currency: string } {
  return PLAN_PRICES[plan];
}

export function isPlanFeatureEnabled(plan: PlanName, feature: keyof PlanLimits): boolean {
  const limits = PLANS[plan];
  const value = limits[feature];
  return value !== false && value !== 0;
}