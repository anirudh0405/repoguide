// Server-side AI provider abstraction. Everything above this boundary talks to
// AIProvider, never to a specific vendor. This lets RepoGuide swap providers
// (hosted models, self-hosted NVIDIA NIM, another inference service) without
// touching the onboarding system.

import "server-only";

import { NVIDIAProvider } from "@/lib/ai/nvidia-provider";

export type AIErrorCode =
  | "NOT_CONFIGURED"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "MODEL_ERROR"
  | "SERVER_ERROR";

export class AIError extends Error {
  code: AIErrorCode;

  constructor(code: AIErrorCode, message: string) {
    super(message);
    this.name = "AIError";
    this.code = code;
  }
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  /** Returns the raw model reply. The caller is responsible for validation. */
  generateStructured(systemPrompt: string, userPrompt: string): Promise<string>;
}

/** True when at least one provider has been configured. */
export function isAIConfigured(): boolean {
  return Boolean(process.env.NVIDIA_API_KEY);
}

/** Returns the configured provider. Throws AIError(NOT_CONFIGURED) otherwise. */
export function getAIProvider(): AIProvider {
  if (!isAIConfigured()) {
    throw new AIError(
      "NOT_CONFIGURED",
      "AI documentation is not configured. Add NVIDIA_API_KEY to the server environment."
    );
  }
  return new NVIDIAProvider();
}

/** Publicly readable provider/model info (no secrets). */
export function getProviderInfo(): { name: string; model: string } {
  if (!isAIConfigured()) {
    return { name: "none", model: "none" };
  }
  const provider = getAIProvider();
  return { name: provider.name, model: provider.model };
}