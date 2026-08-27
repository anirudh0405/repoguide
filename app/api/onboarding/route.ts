import { NextRequest, NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";
import { getPrisma } from "@/lib/db";

const ONBOARDING_STEPS = [
  "connect-repo",
  "analyze-repo",
  "read-guide",
  "ask-question",
] as const;

type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export async function GET(_request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboardingCompleted: true, onboardingStep: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const currentStepIndex = user.onboardingStep ? ONBOARDING_STEPS.indexOf(user.onboardingStep as OnboardingStep) : 0;
  const currentStep = currentStepIndex >= 0 ? ONBOARDING_STEPS[currentStepIndex] : ONBOARDING_STEPS[0];

  return NextResponse.json({
    completed: user.onboardingCompleted,
    currentStep,
    steps: ONBOARDING_STEPS.map((step, index) => ({
      id: step,
      label: getStepLabel(step),
      completed: user.onboardingCompleted || index < currentStepIndex,
      current: index === currentStepIndex,
    })),
  });
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { step, completed } = body as { step: string; completed?: boolean };

    if (!ONBOARDING_STEPS.includes(step as OnboardingStep)) {
      return NextResponse.json({ error: "Invalid step" }, { status: 400 });
    }

    const stepIndex = ONBOARDING_STEPS.indexOf(step as OnboardingStep);
    const nextStep = stepIndex < ONBOARDING_STEPS.length - 1 ? ONBOARDING_STEPS[stepIndex + 1] : null;
    const allCompleted = nextStep === null && completed;

    await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingStep: allCompleted ? null : nextStep,
        onboardingCompleted: allCompleted,
      },
    });

    return NextResponse.json({ success: true, nextStep, completed: allCompleted });
  } catch {
    return NextResponse.json({ error: "Failed to update onboarding" }, { status: 500 });
  }
}

function getStepLabel(step: OnboardingStep): string {
  switch (step) {
    case "connect-repo":
      return "Connect your first repository";
    case "analyze-repo":
      return "Analyze repository";
    case "read-guide":
      return "Read your onboarding guide";
    case "ask-question":
      return "Ask your first question";
  }
}