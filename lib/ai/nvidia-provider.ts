// NVIDIA NIM provider. NVIDIA exposes an OpenAI-compatible chat completions
// API, so we reuse that protocol rather than a vendor-specific SDK.

import "server-only";

import { AIError, type AIProvider } from "@/lib/ai/ai-provider";

const DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";
const DEFAULT_MODEL = "nvidia/nemotron-3.5-lightning-30b-a3b";
const REQUEST_TIMEOUT_MS = 180_000; // Nemotron reasoning can be slow.

function configuredBaseUrl(): string {
  return (process.env.NVIDIA_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function configuredModel(): string {
  return process.env.NVIDIA_MODEL ?? DEFAULT_MODEL;
}

export class NVIDIAProvider implements AIProvider {
  readonly name = "nvidia-nim";
  readonly model = configuredModel();

  async generateStructured(systemPrompt: string, userPrompt: string): Promise<string> {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      throw new AIError(
        "NOT_CONFIGURED",
        "AI documentation is not configured. Add NVIDIA_API_KEY to the server environment."
      );
    }

    const response = await fetch(`${configuredBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (response.status === 401 || response.status === 403) {
      throw new AIError(
        "UNAUTHORIZED",
        "The AI provider rejected the API key. Check NVIDIA_API_KEY."
      );
    }
    if (response.status === 429) {
      throw new AIError(
        "RATE_LIMITED",
        "The AI provider is rate limiting requests. Wait a moment and try again."
      );
    }
    if (response.status === 400 || response.status === 422) {
      throw new AIError(
        "MODEL_ERROR",
        "The AI provider rejected the request (invalid model or malformed request)."
      );
    }
    if (response.status === 503 || response.status === 504) {
      throw new AIError(
        "TIMEOUT",
        "The AI provider timed out. The repository may be too large — try again."
      );
    }
    if (!response.ok) {
      throw new AIError(
        "SERVER_ERROR",
        `The AI provider returned an error (HTTP ${response.status}).`
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new AIError("SERVER_ERROR", "The AI provider returned an unreadable response.");
    }

    const content =
      data &&
      typeof data === "object" &&
      "choices" in data &&
      Array.isArray((data as { choices?: unknown[] }).choices) &&
      ((data as { choices: unknown[] }).choices[0] as { message?: { content?: unknown } })
        ?.message?.content;

    if (typeof content !== "string" || content.trim().length === 0) {
      throw new AIError("MODEL_ERROR", "The AI provider returned an empty response.");
    }
    return content;
  }
}