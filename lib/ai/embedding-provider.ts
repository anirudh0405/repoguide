// Embedding provider for retrieval.
//
// NVIDIA NIM exposes an OpenAI-compatible /v1/embeddings endpoint. The default
// model (nvidia/nv-embedqa-e5-v5) is a retrieval QA model with 1024-dimension
// output and is dual-mode: use `input_type: "passage"` when indexing code and
// `input_type: "query"` when embedding a user question (mismatching modes
// measurably hurts retrieval accuracy).
//
// Everything is configurable so a different provider/model can be dropped in
// by changing environment variables (see .env.example).

import "server-only";

import { AIError } from "@/lib/ai/ai-provider";

const DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";
const DEFAULT_MODEL = "nvidia/nv-embedqa-e5-v5";
export const DEFAULT_EMBEDDING_DIMENSIONS = 1024;
const REQUEST_TIMEOUT_MS = 60_000;
const BATCH_SIZE = 32;

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

function configuredBaseUrl(): string {
  return (envValue("EMBEDDING_BASE_URL") ?? envValue("NVIDIA_BASE_URL") ?? DEFAULT_BASE_URL).replace(
    /\/+$/,
    ""
  );
}

function configuredModel(): string {
  return envValue("EMBEDDING_MODEL") ?? DEFAULT_MODEL;
}

function configuredKey(): string {
  return envValue("EMBEDDING_API_KEY") ?? envValue("NVIDIA_API_KEY") ?? "";
}

function configuredDimensions(): number {
  const parsed = Number.parseInt(envValue("EMBEDDING_DIMENSIONS") ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_EMBEDDING_DIMENSIONS;
}

export function isEmbeddingConfigured(): boolean {
  return configuredKey().length > 0;
}

export function getEmbeddingDimensions(): number {
  return configuredDimensions();
}

export function getEmbeddingProvider(): EmbeddingProvider {
  if (!isEmbeddingConfigured()) {
    throw new AIError(
      "NOT_CONFIGURED",
      "Embeddings are not configured. Add NVIDIA_API_KEY (or EMBEDDING_API_KEY) to the server environment."
    );
  }
  return new NIMEmbeddingProvider();
}

class NIMEmbeddingProvider implements EmbeddingProvider {
  readonly name = "nvidia-nim-embeddings";
  readonly model = configuredModel();
  readonly dimensions = configuredDimensions();

  async embedTexts(texts: string[], inputType: EmbeddingInputType): Promise<number[][]> {
    const apiKey = configuredKey();
    if (!apiKey) {
      throw new AIError(
        "NOT_CONFIGURED",
        "Embeddings are not configured. Add NVIDIA_API_KEY to the server environment."
      );
    }

    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      results.push(...(await this.embedBatch(batch, inputType, apiKey)));
    }
    return results;
  }

  private async embedBatch(
    texts: string[],
    inputType: EmbeddingInputType,
    apiKey: string
  ): Promise<number[][]> {
    const body: Record<string, unknown> = {
      model: this.model,
      input: texts,
      encoding_format: "float",
      input_type: inputType,
      // Truncate (keep the start) rather than error if a chunk is somehow over
      // the model's token limit — indexing must never die on one big chunk.
      truncate: "END",
    };

    const response = await fetch(`${configuredBaseUrl()}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    // Some OpenAI-compatible gateways reject extra NVIDIA-specific fields.
    // Retry once without them before giving up.
    if (response.status === 400 || response.status === 422) {
      let firstDetail = "";
      try {
        firstDetail = (await response.text()).slice(0, 200).replace(/\s+/g, " ").trim();
      } catch {
        // Response already consumed or unreadable.
      }
      const retry = await fetch(`${configuredBaseUrl()}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model: this.model, input: texts, encoding_format: "float" }),
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (retry.ok) return this.parseResponse(retry);
      let retryDetail = "";
      try {
        retryDetail = (await retry.text()).slice(0, 200).replace(/\s+/g, " ").trim();
      } catch {
        // Response already consumed or unreadable.
      }
      throw new AIError(
        "SERVER_ERROR",
        `The embedding provider rejected the request (HTTP ${retry.status}).${retryDetail ? ` ${retryDetail}` : ""}${firstDetail ? ` (initial response: ${firstDetail})` : ""}`
      );
    }

    return this.parseResponse(response);
  }

  private async parseResponse(response: Response): Promise<number[][]> {
    if (response.status === 401 || response.status === 403) {
      throw new AIError(
        "UNAUTHORIZED",
        "The embedding provider rejected the API key. Check your NVIDIA/embedding API key."
      );
    }
    if (response.status === 429) {
      throw new AIError(
        "RATE_LIMITED",
        "The embedding provider is rate limiting requests. Wait a moment and try again."
      );
    }
    if (!response.ok) {
      let detail = "";
      try {
        detail = (await response.text()).slice(0, 200).replace(/\s+/g, " ").trim();
      } catch {
        // Response already consumed or unreadable.
      }
      throw new AIError(
        "SERVER_ERROR",
        `The embedding provider returned an error (HTTP ${response.status}).${detail ? ` ${detail}` : ""}`
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new AIError("SERVER_ERROR", "The embedding provider returned an unreadable response.");
    }

    const list =
      data && typeof data === "object" && "data" in data
        ? (data as { data?: unknown[] }).data
        : null;
    if (!Array.isArray(list)) {
      throw new AIError("MODEL_ERROR", "The embedding provider returned an unexpected response.");
    }

    const vectors = list
      .map((item) => {
        if (item && typeof item === "object" && "embedding" in item) {
          return (item as { embedding: unknown }).embedding;
        }
        return null;
      })
      .filter((embedding): embedding is number[] => Array.isArray(embedding));

    if (vectors.length !== list.length) {
      throw new AIError("MODEL_ERROR", "The embedding provider returned malformed vectors.");
    }
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
  }
}