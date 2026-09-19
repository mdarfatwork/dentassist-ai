import { env } from "@/config/env";
import { getErrorMessage } from "../storage/s3";

export interface IEmbeddingService {
  embedText(text: string, inputType?: "passage" | "query"): Promise<number[]>;
  embedTexts(
    texts: string[],
    inputType?: "passage" | "query",
  ): Promise<number[][]>;
  getDimensions(): number;
}

/**
 * Pinecone Hosted Inference Embedding Service.
 * Uses Pinecone's Inference API (e.g. multilingual-e5-large, 1024 dims) without requiring OpenAI.
 */
export class PineconeEmbeddingService implements IEmbeddingService {
  private client: unknown = null;
  private readonly model: string;
  private readonly dimensions = 1024;
  private readonly batchSize = 64;

  constructor(model?: string) {
    this.model = model || env.EMBEDDING_MODEL || "multilingual-e5-large";
  }

  private async getClient() {
    if (this.client) return this.client;

    const apiKey = env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error(
        "PINECONE_API_KEY is not configured. Please set PINECONE_API_KEY in your environment.",
      );
    }

    const { Pinecone } = await import("@pinecone-database/pinecone");
    this.client = new Pinecone({ apiKey });
    return this.client;
  }

  public getDimensions(): number {
    return this.dimensions;
  }

  public async embedText(
    text: string,
    inputType: "passage" | "query" = "passage",
  ): Promise<number[]> {
    const results = await this.embedTexts([text], inputType);
    if (!results[0]) {
      throw new Error(
        "Failed to generate embedding: empty response from provider.",
      );
    }
    return results[0];
  }

  public async embedTexts(
    texts: string[],
    inputType: "passage" | "query" = "passage",
  ): Promise<number[][]> {
    if (texts.length === 0) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pc = (await this.getClient()) as any;
    const allEmbeddings: number[][] = [];

    // Process in batches
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);

      try {
        const response = await pc.inference.embed({
          model: this.model,
          inputs: batch,
          parameters: {
            inputType,
            truncate: "END",
          },
        });

        // response is an EmbeddingsList containing .data with embedding .values
        const items = Array.isArray(response) ? response : response?.data || [];

        const embeddings = items.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (item: any) => item?.values || item?.embedding || item,
        );

        allEmbeddings.push(...embeddings);
      } catch (err: unknown) {
        const msg = getErrorMessage(err);
        throw new Error(`Embedding generation failed: ${msg}`);
      }
    }

    return allEmbeddings;
  }
}

/**
 * Deterministic Mock Embedding Service for local tests or offline environments.
 */
export class MockEmbeddingService implements IEmbeddingService {
  private readonly dimensions = 1024;

  public getDimensions(): number {
    return this.dimensions;
  }

  public async embedText(text: string): Promise<number[]> {
    return this.generateDeterministicVector(text);
  }

  public async embedTexts(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.generateDeterministicVector(t));
  }

  private generateDeterministicVector(text: string): number[] {
    const vec: number[] = new Array(this.dimensions).fill(0);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = Math.trunc((hash << 5) - hash + (text.codePointAt(i) ?? 0));
    }

    for (let i = 0; i < this.dimensions; i++) {
      vec[i] = Math.sin(hash + i);
    }

    // Normalize vector
    const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    return norm === 0 ? vec : vec.map((v) => v / norm);
  }
}

export const embeddingService: IEmbeddingService =
  env.EMBEDDING_PROVIDER === "mock" ||
  (!env.PINECONE_API_KEY && env.NODE_ENV === "test")
    ? new MockEmbeddingService()
    : new PineconeEmbeddingService();
