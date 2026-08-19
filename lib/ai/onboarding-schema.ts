// Structured output schema for the generated onboarding guide, plus the
// sanitizers that make the model's output safe to store and display:
//   - only real file paths survive (never-invent rule),
//   - environment variables are names only,
//   - output is validated before it is stored.

import { z } from "zod";

export const OnboardingGuideContentSchema = z.object({
  projectOverview: z.string().min(1),
  technologyStack: z.array(z.string()),
  architectureOverview: z.string().min(1),
  directoryGuide: z.array(
    z.object({
      path: z.string(),
      purpose: z.string(),
    })
  ),
  importantFiles: z.array(
    z.object({
      path: z.string(),
      purpose: z.string(),
      whyItMatters: z.string(),
      relatedFiles: z.array(z.string()),
    })
  ),
  applicationFlows: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      steps: z.array(z.string()),
      relatedFiles: z.array(z.string()),
    })
  ),
  gettingStarted: z.array(z.string()),
  environmentVariables: z.array(z.string()),
  recommendedReadingOrder: z.array(
    z.object({
      path: z.string(),
      reason: z.string(),
    })
  ),
});

export type OnboardingGuideContent = z.infer<typeof OnboardingGuideContentSchema>;

/** Strip markdown code fences and surrounding noise from a JSON reply. */
export function extractJson(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

/** Sanitizes raw model output into validated, safe guide content. */
export function sanitizeGuideContent(
  parsed: OnboardingGuideContent,
  existingPaths: Set<string>
): OnboardingGuideContent {
  const pathExists = (path: string) => existingPaths.has(normalizeRef(path));

  const importantFiles = parsed.importantFiles
    .map((file) => ({
      ...file,
      path: normalizeRef(file.path),
      relatedFiles: Array.from(
        new Set(file.relatedFiles.map(normalizeRef).filter((p) => p !== file.path && pathExists(p)))
      ),
    }))
    .filter((file) => pathExists(file.path))
    // Keep at most one entry per path.
    .filter(
      (file, index, all) => all.findIndex((other) => other.path === file.path) === index
    );

  const applicationFlows = parsed.applicationFlows.map((flow) => ({
    ...flow,
    name: flow.name.trim().slice(0, 200),
    description: flow.description.trim(),
    steps: flow.steps.map((step) => step.trim()).filter(Boolean),
    relatedFiles: Array.from(
      new Set(flow.relatedFiles.map(normalizeRef).filter((p) => pathExists(p)))
    ),
  }));

  const directoryGuide = parsed.directoryGuide
    .map((dir) => ({
      path: normalizeRef(dir.path).replace(/\/+$/, ""),
      purpose: dir.purpose.trim(),
    }))
    .filter((dir) => dir.path.length > 0);

  const recommendedReadingOrder = parsed.recommendedReadingOrder
    .map((item) => ({ ...item, path: normalizeRef(item.path) }))
    .filter((item) => pathExists(item.path) || isDirectoryRef(item.path, existingPaths));

  // Environment variables are names only — anything else is discarded.
  const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const environmentVariables = Array.from(
    new Set(
      parsed.environmentVariables
        .map((name) => name.trim().toUpperCase())
        .filter((name) => ENV_NAME.test(name))
    )
  ).slice(0, 100);

  return {
    projectOverview: parsed.projectOverview.trim(),
    technologyStack: Array.from(new Set(parsed.technologyStack.map((t) => t.trim()).filter(Boolean))),
    architectureOverview: parsed.architectureOverview.trim(),
    directoryGuide,
    importantFiles,
    applicationFlows,
    gettingStarted: Array.from(
      new Set(parsed.gettingStarted.map((step) => step.trim()).filter(Boolean))
    ),
    environmentVariables,
    recommendedReadingOrder,
  };
}

/** Normalize a model-provided path: strip quotes, markdown links, leading ./ */
function normalizeRef(path: string): string {
  return path
    .trim()
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .replace(/^`|`$/g, "")
    .replace(/^\.\//, "");
}

function isDirectoryRef(path: string, existingPaths: Set<string>): boolean {
  const prefix = path.endsWith("/") ? path : `${path}/`;
  for (const existing of existingPaths) {
    if (existing.startsWith(prefix)) return true;
  }
  return false;
}