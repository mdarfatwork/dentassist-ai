import { env } from "@/config/env";
import { type SemanticChunk } from "./chunker";
import { getErrorMessage } from "../storage/s3";

export interface VectorRecordMetadata {
  organizationId: string;
  documentId: string;
  chunkId: string;
  documentName: string;
  headingPath: string;
  chunkIndex: number;
  pageNumber: number;
  [key: string]: unknown;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: VectorRecordMetadata;
}

export interface IVectorStore {
  upsertChunks(params: {
    organizationId: string;
    documentId: string;
    documentName: string;
    chunks: Array<SemanticChunk & { id: string }>;
    embeddings: number[][];
  }): Promise<void>;
  deleteByVectorIds(params: {
    organizationId: string;
    vectorIds: string[];
  }): Promise<void>;
  searchSimilar(params: {
    organizationId: string;
    queryVector: number[];
    topK?: number;
  }): Promise<VectorSearchResult[]>;
}

/**
 * Generates a collision-safe, deterministic vector ID.
 */
export function buildPineconeVectorId(params: {
  organizationId: string;
  documentId: string;
  chunkId: string;
}): string {
  return `${params.organizationId}:${params.documentId}:${params.chunkId}`;
}

/**
 * Resolves the tenant-isolated Pinecone namespace.
 */
export function resolvePineconeNamespace(organizationId: string): string {
  if (env.PINECONE_NAMESPACE_PREFIX) {
    return `${env.PINECONE_NAMESPACE_PREFIX}-${organizationId}`;
  }
  return organizationId;
}

function isIndexNotFoundError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === "PineconeNotFoundError" ||
      err.message.includes("404") ||
      err.message.includes("not found"))
  );
}

/**
 * Pinecone Vector Store implementation.
 */
export class PineconeVectorStore implements IVectorStore {
  private client: unknown = null;
  private readonly indexName: string;

  private resolvedIndexName: string | null = null;
  private resolvedHost: string | null = null;

  constructor(indexName?: string) {
    this.indexName = indexName || env.PINECONE_INDEX || "dentassist";
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async resolveExistingIndexes(pc: any): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let availableIndexes: any[] = [];
    try {
      const list = await pc.indexes.list();
      availableIndexes = list?.indexes || [];
    } catch (listErr) {
      console.warn("[Pinecone Vector Store] Failed to list indexes:", listErr);
    }

    if (availableIndexes.length === 0) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const names = availableIndexes.map((i: any) => i.name);

    // If exactly 1 index exists in the project, automatically bind to it
    if (availableIndexes.length === 1 && availableIndexes[0].host) {
      const auto = availableIndexes[0];
      console.info(
        `[Pinecone Vector Store] Auto-connecting to existing Pinecone index "${auto.name}" (${auto.host}). To silence this, set PINECONE_INDEX="${auto.name}" in .env.`,
      );
      this.resolvedIndexName = auto.name;
      this.resolvedHost = auto.host;
      return pc.index({ host: auto.host });
    }

    throw new Error(
      `Pinecone index "${this.indexName}" was not found. Your Pinecone account has the following index(es): [${names.join(", ")}]. Please update PINECONE_INDEX in your .env file to match one of these.`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async createServerlessIndex(pc: any): Promise<any> {
    console.info(
      `[Pinecone Vector Store] No index found in Pinecone project. Creating serverless index "${this.indexName}" (dim: 1024, metric: cosine)...`,
    );

    try {
      await pc.indexes.create({
        name: this.indexName,
        dimension: 1024,
        metric: "cosine",
        spec: {
          serverless: {
            cloud: "aws",
            region: "us-east-1",
          },
        },
        waitUntilReady: true,
      });

      const created = await pc.indexes.describe(this.indexName);
      this.resolvedIndexName = created.name;
      this.resolvedHost = created.host;
      console.info(
        `[Pinecone Vector Store] Successfully created and ready: "${this.indexName}".`,
      );
      return pc.index({ host: created.host });
    } catch (createErr: unknown) {
      const msg = getErrorMessage(createErr);
      throw new Error(
        `Pinecone index "${this.indexName}" not found and automatic creation failed (${msg}). Please create a Serverless index named "${this.indexName}" (dimension: 1024, metric: cosine, cloud: aws, region: us-east-1) in the Pinecone console: https://app.pinecone.io`,
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleMissingIndex(pc: any): Promise<any> {
    console.warn(
      `[Pinecone Vector Store] Index "${this.indexName}" not found. Inspecting available indexes in Pinecone account...`,
    );

    const existingTarget = await this.resolveExistingIndexes(pc);
    if (existingTarget) {
      return existingTarget;
    }

    return this.createServerlessIndex(pc);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async ensureIndexTarget(pc: any): Promise<any> {
    if (this.resolvedHost) {
      return pc.index({ host: this.resolvedHost });
    }

    if (env.PINECONE_HOST) {
      this.resolvedHost = env.PINECONE_HOST;
      return pc.index({ host: env.PINECONE_HOST });
    }

    try {
      const desc = await pc.indexes.describe(this.indexName);
      if (desc?.host) {
        this.resolvedIndexName = desc.name;
        this.resolvedHost = desc.host;
        return pc.index({ host: desc.host });
      }
    } catch (err: unknown) {
      if (!isIndexNotFoundError(err)) {
        throw err;
      }

      return this.handleMissingIndex(pc);
    }

    return pc.index(this.indexName);
  }

  private async getIndex(namespace: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pc = (await this.getClient()) as any;
    const target = await this.ensureIndexTarget(pc);
    return target.namespace(namespace);
  }

  public async upsertChunks(params: {
    organizationId: string;
    documentId: string;
    documentName: string;
    chunks: Array<SemanticChunk & { id: string }>;
    embeddings: number[][];
  }): Promise<void> {
    const { organizationId, documentId, documentName, chunks, embeddings } =
      params;
    if (chunks.length === 0) return;

    const namespace = resolvePineconeNamespace(organizationId);
    const index = await this.getIndex(namespace);

    const records = chunks.map((chunk, i) => {
      const vectorId = buildPineconeVectorId({
        organizationId,
        documentId,
        chunkId: chunk.id,
      });

      return {
        id: vectorId,
        values: embeddings[i],
        metadata: {
          organizationId,
          documentId,
          chunkId: chunk.id,
          documentName,
          headingPath: chunk.headingPath || "",
          chunkIndex: chunk.chunkIndex,
          pageNumber: chunk.pageNumber || 1,
        } satisfies VectorRecordMetadata,
      };
    });

    // Upsert in batches of 100
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      if (batch.length > 0) {
        await index.upsert({ records: batch });
      }
    }
  }

  public async deleteByVectorIds(params: {
    organizationId: string;
    vectorIds: string[];
  }): Promise<void> {
    if (params.vectorIds.length === 0) return;

    const namespace = resolvePineconeNamespace(params.organizationId);
    const index = await this.getIndex(namespace);

    try {
      await index.deleteMany({ ids: params.vectorIds });
    } catch (err: unknown) {
      console.warn(
        `[Pinecone Vector Store] Failed to delete vectors in namespace ${namespace}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  public async searchSimilar(params: {
    organizationId: string;
    queryVector: number[];
    topK?: number;
  }): Promise<VectorSearchResult[]> {
    const namespace = resolvePineconeNamespace(params.organizationId);
    const index = await this.getIndex(namespace);
    const topK = params.topK || env.RAG_TOP_K || 5;

    const queryResponse = await index.query({
      vector: params.queryVector,
      topK,
      includeMetadata: true,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (queryResponse.matches || []).map((match: any) => ({
      id: match.id,
      score: match.score ?? 0,
      metadata: match.metadata as VectorRecordMetadata,
    }));
  }
}

/**
 * In-memory Mock Vector Store for automated tests.
 */
export class MockVectorStore implements IVectorStore {
  private readonly store: Map<
    string,
    Array<{ id: string; values: number[]; metadata: VectorRecordMetadata }>
  > = new Map();

  public async upsertChunks(params: {
    organizationId: string;
    documentId: string;
    documentName: string;
    chunks: Array<SemanticChunk & { id: string }>;
    embeddings: number[][];
  }): Promise<void> {
    const namespace = resolvePineconeNamespace(params.organizationId);
    const current = this.store.get(namespace) || [];

    const newRecords = params.chunks.map((chunk, i) => ({
      id: buildPineconeVectorId({
        organizationId: params.organizationId,
        documentId: params.documentId,
        chunkId: chunk.id,
      }),
      values: params.embeddings[i],
      metadata: {
        organizationId: params.organizationId,
        documentId: params.documentId,
        chunkId: chunk.id,
        documentName: params.documentName,
        headingPath: chunk.headingPath || "",
        chunkIndex: chunk.chunkIndex,
        pageNumber: chunk.pageNumber || 1,
      },
    }));

    // Filter out existing and add new
    const filtered = current.filter(
      (r) => !newRecords.some((nr) => nr.id === r.id),
    );
    this.store.set(namespace, [...filtered, ...newRecords]);
  }

  public async deleteByVectorIds(params: {
    organizationId: string;
    vectorIds: string[];
  }): Promise<void> {
    const namespace = resolvePineconeNamespace(params.organizationId);
    const current = this.store.get(namespace) || [];
    this.store.set(
      namespace,
      current.filter((r) => !params.vectorIds.includes(r.id)),
    );
  }

  public async searchSimilar(params: {
    organizationId: string;
    queryVector: number[];
    topK?: number;
  }): Promise<VectorSearchResult[]> {
    const namespace = resolvePineconeNamespace(params.organizationId);
    const records = this.store.get(namespace) || [];

    // Cosine similarity
    const scored = records.map((r) => {
      let dot = 0;
      let magA = 0;
      let magB = 0;
      for (let i = 0; i < r.values.length; i++) {
        dot += r.values[i] * (params.queryVector[i] || 0);
        magA += r.values[i] * r.values[i];
        magB += (params.queryVector[i] || 0) * (params.queryVector[i] || 0);
      }
      const score =
        magA && magB ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
      return {
        id: r.id,
        score,
        metadata: r.metadata,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, params.topK || 5);
  }
}

export const vectorStore: IVectorStore =
  env.EMBEDDING_PROVIDER === "mock" ||
  (!env.PINECONE_API_KEY && env.NODE_ENV === "test")
    ? new MockVectorStore()
    : new PineconeVectorStore();
