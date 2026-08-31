// Groq provider for LLM generation.
// Uses the official Groq TypeScript SDK with OpenAI-compatible models.

import "server-only";

import Groq from "groq-sdk";
import { AIError, type AIProvider } from "@/lib/ai/ai-provider";

const DEFAULT_MODEL = "openai/gpt-oss-20b";
const REQUEST_TIMEOUT_MS = 120_000;

function configuredModel(): string {
  return process.env.GROQ_MODEL ?? DEFAULT_MODEL;
}

function apiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new AIError(
      "NOT_CONFIGURED",
      "AI generation is not configured. Add GROQ_API_KEY to the server environment."
    );
  }
  return key;
}

export class GroqProvider implements AIProvider {
  readonly name = "groq";
  readonly model = configuredModel();

  private client: Groq;

  constructor() {
    this.client = new Groq({
      apiKey: apiKey(),
      timeout: REQUEST_TIMEOUT_MS,
    });
  }

  async generateStructured(systemPrompt: string, userPrompt: string): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      throw new AIError("MODEL_ERROR", "The AI provider returned an empty response.");
    }
    return content;
  }

  async generateText(
    systemPrompt: string,
    userPrompt: string,
    onToken: (delta: string) => void
  ): Promise<string> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 2500,
      stream: true,
    });

    let full = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (typeof delta === "string" && delta.length > 0) {
        full += delta;
        onToken(delta);
      }
    }

    if (full.trim().length === 0) {
      throw new AIError("MODEL_ERROR", "The AI provider returned an empty response.");
    }
    return full;
  }
}