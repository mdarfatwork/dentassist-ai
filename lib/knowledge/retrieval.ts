import { db } from "@/lib/db";
import { embeddingService } from "./embeddings";
import { vectorStore } from "./vector-store";
import { type RetrievedChunkContext } from "./context-builder";

export interface RetrievalSearchInput {
  organizationId: string;
  query: string;
  topK?: number;
}

/**
 * RetrievalService
 * Performs semantic vector search scoped strictly to the authenticated organization.
 */
export class RetrievalService {
  /**
   * Searches knowledge base chunks for an organization using semantic vector search.
   */
  public static async search(
    input: RetrievalSearchInput,
  ): Promise<RetrievedChunkContext[]> {
    const { organizationId, query, topK = 5 } = input;

    // 1. Generate query embedding
    const queryVector = await embeddingService.embedText(query, "query");

    // 2. Query Pinecone restricted to organization namespace
    const vectorMatches = await vectorStore.searchSimilar({
      organizationId,
      queryVector,
      topK,
    });

    if (vectorMatches.length === 0) {
      return [];
    }

    // 3. Extract chunk IDs and map scores
    const chunkIdToScore = new Map<string, number>();
    for (const match of vectorMatches) {
      if (match.metadata?.chunkId) {
        chunkIdToScore.set(match.metadata.chunkId, match.score);
      }
    }

    const chunkIds = Array.from(chunkIdToScore.keys());

    // 4. Fetch verified chunk content and document names from PostgreSQL
    const chunks = await db.documentChunk.findMany({
      where: {
        id: { in: chunkIds },
        organizationId, // Strict organization tenant constraint in SQL
      },
      include: {
        document: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    // 5. Filter for documents that are in READY status and construct context
    const retrieved: RetrievedChunkContext[] = chunks
      .filter((c) => c.document.status === "READY")
      .map((c) => ({
        documentId: c.document.id,
        documentName: c.document.name,
        headingPath: c.headingPath,
        pageNumber: c.pageNumber,
        content: c.content,
        score: chunkIdToScore.get(c.id) ?? 0,
      }));

    // Sort by vector similarity score descending
    retrieved.sort((a, b) => b.score - a.score);

    return retrieved;
  }
}
