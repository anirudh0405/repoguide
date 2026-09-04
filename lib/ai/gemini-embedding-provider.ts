// Gemini Embedding Provider
//
// Uses Google's @google/genai SDK for embeddings with gemini-embedding-2.
// Supports task types for passage (RETRIEVAL_DOCUMENT) and query (RETRIEVAL_QUERY)
// to preserve the semantic distinction from NVIDIA's input_type mechanism.

import "server-only";

import { GoogleGenAI } from "@google/genai";
import { AIError } from "@/lib/ai/ai-provider";

const DEFAULT_MODEL = "gemini-embedding-2";
const DEFAULT_DIMENSIONS = 3072;
const BATCH_SIZE = 100; // Gemini supports batch embeddings
const MAX_INPUT_TOKENS = 32000; // Safe truncation limit for Gemini Developer API

export type EmbeddingInputType = "passage" | "query";

export interface EmbeddingProvider {
  readonly name: string;
  readonly model: string;
  readonly dimensions: number;
  embedTexts(texts: string[], inputType: EmbeddingInputType): Promise<number[][]>;
}

function envValue(key: string): string | undefined {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value : undefined;
}

function configuredModel(): string {
  return envValue("GEMINI_EMBEDDING_MODEL") ?? DEFAULT_MODEL;
}

function configuredKey(): string {
  const key = envValue("GEMINI_API_KEY");
  if (!key) {
    throw new AIError(
      "NOT_CONFIGURED",
      "Embeddings are not configured. Add GEMINI_API_KEY to the server environment."
    );
  }
  return key;
}

function configuredDimensions(): number {
  const parsed = Number.parseInt(envValue("EMBEDDING_DIMENSIONS") ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DIMENSIONS;
}

function truncateForGeminiDeveloperAPI(text: string): string {
  // Gemini Developer API has input token limits; truncate safely to avoid errors.
  // gemini-embedding-2 supports large inputs, but we cap at 32K tokens to be safe
  // and avoid any model-specific limits or the unsupported autoTruncate parameter.
  const approxCharsPerToken = 3.5;
  const maxChars = Math.floor(MAX_INPUT_TOKENS * approxCharsPerToken);
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars - 100) + "...";
}

function mapInputType(inputType: EmbeddingInputType): string {
  // Gemini uses taskType instead of NVIDIA's input_type
  // RETRIEVAL_DOCUMENT for passages (indexing code chunks)
  // RETRIEVAL_QUERY for queries (user questions)
  return inputType === "passage" ? "RETRIEVAL_DOCUMENT" : "RETRIEVAL_QUERY";
}

export function isGeminiEmbeddingConfigured(): boolean {
  return configuredKey().length > 0;
}

export function getGeminiEmbeddingDimensions(): number {
  return configuredDimensions();
}

export function getGeminiEmbeddingProvider(): EmbeddingProvider {
  if (!isGeminiEmbeddingConfigured()) {
    throw new AIError(
      "NOT_CONFIGURED",
      "Embeddings are not configured. Add GEMINI_API_KEY to the server environment."
    );
  }
  return new GeminiEmbeddingProvider();
}

class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly name = "gemini-embeddings";
  readonly model = configuredModel();
  readonly dimensions = configuredDimensions();

  private client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: configuredKey() });
  }

  async embedTexts(texts: string[], inputType: EmbeddingInputType): Promise<number[][]> {
    const apiKey = configuredKey();
    if (!apiKey) {
      throw new AIError(
        "NOT_CONFIGURED",
        "Embeddings are not configured. Add GEMINI_API_KEY to the server environment."
      );
    }

    const taskType = mapInputType(inputType);
    const results: number[][] = [];

    // Process in batches
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const batchResults = await this.embedBatch(batch, taskType);
      results.push(...batchResults);
    }

    return results;
  }

  private async embedBatch(texts: string[], taskType: string): Promise<number[][]> {
    try {
      const response = await this.client.models.embedContent({
        model: this.model,
        contents: texts.map((t) => truncateForGeminiDeveloperAPI(t)),
        config: {
          taskType,
          outputDimensionality: this.dimensions,
        },
      });

      if (!response.embeddings || !Array.isArray(response.embeddings)) {
        throw new AIError("SERVER_ERROR", "The embedding provider returned an unexpected response format.");
      }

      const vectors = response.embeddings.map((embedding) => {
        if (!embedding.values || !Array.isArray(embedding.values)) {
          throw new AIError("MODEL_ERROR", "The embedding provider returned malformed vectors (missing values).");
        }
        return embedding.values;
      });

      // Validate dimensions
      for (const vector of vectors) {
        if (vector.length !== this.dimensions) {
          throw new AIError(
            "MODEL_ERROR",
            `Embedding dimension mismatch: expected ${this.dimensions}, got ${vector.length}. ` +
              "Set EMBEDDING_DIMENSIONS to match your model."
          );
        }
      }

      return vectors;
    } catch (error) {
      if (error instanceof AIError) throw error;

      // Handle specific error cases
      const message = error instanceof Error ? error.message : String(error);
      
      if (message.includes("401") || message.includes("403") || message.includes("UNAUTHORIZED")) {
        throw new AIError(
          "UNAUTHORIZED",
          "The embedding provider rejected the API key. Check your GEMINI_API_KEY."
        );
      }
      if (message.includes("429") || message.includes("RATE_LIMIT") || message.includes("rate limit")) {
        throw new AIError(
          "RATE_LIMITED",
          "The embedding provider is rate limiting requests. Wait a moment and try again."
        );
      }
      if (message.includes("400") || message.includes("422") || message.includes("INVALID_ARGUMENT")) {
        throw new AIError(
          "MODEL_ERROR",
          `The embedding provider rejected the request (invalid model or malformed request): ${message}`
        );
      }
      if (message.includes("503") || message.includes("504") || message.includes("timeout")) {
        throw new AIError(
          "TIMEOUT",
          "The embedding provider timed out. Try again."
        );
      }
      
      throw new AIError(
        "SERVER_ERROR",
        `The embedding provider returned an error: ${message}`
      );
    }
  }
}