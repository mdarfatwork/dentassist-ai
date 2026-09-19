import { db } from "@/lib/db";
import {
  buildKnowledgeStorageKeys,
  storeOriginalDocument,
  storeCanonicalMarkdown,
  getCanonicalMarkdown,
  downloadS3Buffer,
  deleteDocumentS3Folder,
} from "./storage";
import { DocumentProcessor } from "./parser";
import { MarkdownNormalizer } from "./normalizer";
import { ChunkingService } from "./chunker";
import { embeddingService } from "./embeddings";
import { vectorStore, buildPineconeVectorId } from "./vector-store";
import { RetrievalService } from "./retrieval";
import { ContextBuilder } from "./context-builder";
import { PromptGuardService } from "./prompt-guard";
import { llmService, type RAGAnswerResponse } from "./llm";
import { TRPCError } from "@trpc/server";

export class KnowledgeService {
  /**
   * Uploads an original document to S3, creates the database record, and extracts canonical Markdown.
   */
  public static async uploadDocument(params: {
    organizationId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    buffer: Buffer;
  }) {
    const { organizationId, filename, mimeType, sizeBytes, buffer } = params;

    // 1. Create a placeholder Document record in PROCESSING status
    const doc = await db.document.create({
      data: {
        organizationId,
        name: filename,
        mimeType,
        sizeBytes,
        originalStorageKey: "", // Updated below with generated ID
        status: "PROCESSING",
      },
    });

    const storageKeys = buildKnowledgeStorageKeys({
      organizationId,
      documentId: doc.id,
      filename,
    });

    try {
      // 2. Upload original file to Neon S3
      await storeOriginalDocument({
        key: storageKeys.originalKey,
        body: buffer,
        contentType: mimeType,
      });

      // Update original storage key in database
      await db.document.update({
        where: { id: doc.id },
        data: { originalStorageKey: storageKeys.originalKey },
      });

      // 3. Extract text and normalize into canonical Markdown
      const parsed = await DocumentProcessor.process({
        buffer,
        mimeType,
        filename,
      });

      // 4. Store extracted canonical Markdown in S3
      await storeCanonicalMarkdown({
        key: storageKeys.markdownKey,
        markdown: parsed.markdown,
      });

      // 5. Update document to REVIEW status
      const updated = await db.document.update({
        where: { id: doc.id },
        data: {
          markdownStorageKey: storageKeys.markdownKey,
          status: "REVIEW",
          errorMessage: null,
        },
      });

      return updated;
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to extract document.";
      console.error(
        `[KnowledgeService] Extraction error for doc ${doc.id}:`,
        err,
      );

      await db.document.update({
        where: { id: doc.id },
        data: {
          status: "FAILED",
          errorMessage,
        },
      });

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: errorMessage,
      });
    }
  }

  /**
   * Updates the canonical Markdown for a document in S3.
   */
  public static async updateMarkdown(params: {
    organizationId: string;
    documentId: string;
    markdown: string;
  }) {
    const { organizationId, documentId, markdown } = params;

    const doc = await db.document.findFirst({
      where: { id: documentId, organizationId },
    });

    if (!doc) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Document not found or access denied.",
      });
    }

    const normalized = MarkdownNormalizer.normalize(markdown);
    const markdownKey =
      doc.markdownStorageKey ||
      buildKnowledgeStorageKeys({
        organizationId,
        documentId,
        filename: doc.name,
      }).markdownKey;

    await storeCanonicalMarkdown({
      key: markdownKey,
      markdown: normalized,
    });

    return await db.document.update({
      where: { id: documentId },
      data: {
        markdownStorageKey: markdownKey,
        status: "REVIEW", // Mark back to REVIEW until processed
        errorMessage: null,
      },
    });
  }

  /**
   * Chunks, embeds, and indexes the canonical Markdown into Pinecone.
   * Transitions document from REVIEW -> READY (or FAILED).
   */
  public static async processDocument(params: {
    organizationId: string;
    documentId: string;
  }) {
    const { organizationId, documentId } = params;

    const doc = await db.document.findFirst({
      where: { id: documentId, organizationId },
      include: { chunks: true },
    });

    if (!doc) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Document not found or access denied.",
      });
    }

    if (!doc.markdownStorageKey) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "No canonical Markdown found for this document.",
      });
    }

    // Mark as PROCESSING
    await db.document.update({
      where: { id: documentId },
      data: { status: "PROCESSING", errorMessage: null },
    });

    try {
      // 1. Download canonical Markdown from S3
      const markdown = await getCanonicalMarkdown(doc.markdownStorageKey);

      // 2. Perform structure-aware chunking
      const rawChunks = ChunkingService.chunkMarkdown(markdown);

      if (rawChunks.length === 0) {
        throw new Error("Document produced no readable content chunks.");
      }

      // 3. Purge existing vector IDs from Pinecone to prevent orphaned vectors
      if (doc.chunks.length > 0) {
        const oldVectorIds = doc.chunks.map((c) => c.pineconeVectorId);
        await vectorStore.deleteByVectorIds({
          organizationId,
          vectorIds: oldVectorIds,
        });

        // Remove old relational chunks from database
        await db.documentChunk.deleteMany({
          where: { documentId },
        });
      }

      // 4. Create new DocumentChunk records in PostgreSQL
      const createdChunks = await Promise.all(
        rawChunks.map(async (rc) => {
          // Temporary ID generation for deterministic vector mapping
          const tempChunk = await db.documentChunk.create({
            data: {
              documentId,
              organizationId,
              chunkIndex: rc.chunkIndex,
              content: rc.content,
              headingPath: rc.headingPath,
              pageNumber: rc.pageNumber,
              pineconeVectorId: "", // will update below
            },
          });

          const vectorId = buildPineconeVectorId({
            organizationId,
            documentId,
            chunkId: tempChunk.id,
          });

          return await db.documentChunk.update({
            where: { id: tempChunk.id },
            data: { pineconeVectorId: vectorId },
          });
        }),
      );

      // 5. Generate batch embeddings
      const chunkTexts = createdChunks.map((c) => c.content);
      const embeddings = await embeddingService.embedTexts(
        chunkTexts,
        "passage",
      );

      // 6. Upsert vectors into Pinecone (tenant isolated)
      await vectorStore.upsertChunks({
        organizationId,
        documentId,
        documentName: doc.name,
        chunks: createdChunks.map((c) => ({
          id: c.id,
          chunkIndex: c.chunkIndex,
          content: c.content,
          headingPath: c.headingPath,
          pageNumber: c.pageNumber,
        })),
        embeddings,
      });

      // 7. Update document status to READY
      return await db.document.update({
        where: { id: documentId },
        data: {
          status: "READY",
          chunkCount: createdChunks.length,
          processedAt: new Date(),
          errorMessage: null,
        },
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Document processing failed.";
      console.error(
        `[KnowledgeService] Processing failure for doc ${documentId}:`,
        err,
      );

      await db.document.update({
        where: { id: documentId },
        data: {
          status: "FAILED",
          errorMessage,
        },
      });

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: errorMessage,
      });
    }
  }

  /**
   * Retries processing for a failed document.
   */
  public static async retryProcessing(params: {
    organizationId: string;
    documentId: string;
  }) {
    const { organizationId, documentId } = params;

    const doc = await db.document.findFirst({
      where: { id: documentId, organizationId },
    });

    if (!doc) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Document not found.",
      });
    }

    // If document already has Markdown, re-run chunking and embedding
    if (doc.markdownStorageKey) {
      return await this.processDocument({ organizationId, documentId });
    }

    // Otherwise, re-extract from original S3 file
    if (doc.originalStorageKey) {
      const buffer = await downloadS3Buffer(doc.originalStorageKey);
      const parsed = await DocumentProcessor.process({
        buffer,
        mimeType: doc.mimeType,
        filename: doc.name,
      });

      const keys = buildKnowledgeStorageKeys({
        organizationId,
        documentId,
        filename: doc.name,
      });

      await storeCanonicalMarkdown({
        key: keys.markdownKey,
        markdown: parsed.markdown,
      });

      return await db.document.update({
        where: { id: documentId },
        data: {
          markdownStorageKey: keys.markdownKey,
          status: "REVIEW",
          errorMessage: null,
        },
      });
    }

    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot retry: original document storage key is missing.",
    });
  }

  /**
   * Securely deletes a document, purging Pinecone vectors, S3 files, and PostgreSQL records.
   */
  public static async deleteDocument(params: {
    organizationId: string;
    documentId: string;
  }) {
    const { organizationId, documentId } = params;

    const doc = await db.document.findFirst({
      where: { id: documentId, organizationId },
      include: { chunks: true },
    });

    if (!doc) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Document not found or access denied.",
      });
    }

    // 1. Delete Pinecone vectors
    if (doc.chunks.length > 0) {
      const vectorIds = doc.chunks.map((c) => c.pineconeVectorId);
      await vectorStore.deleteByVectorIds({
        organizationId,
        vectorIds,
      });
    }

    // 2. Delete S3 files
    await deleteDocumentS3Folder({
      organizationId,
      documentId,
    });

    // 3. Delete Document record in PostgreSQL (cascades chunks)
    await db.document.delete({
      where: { id: documentId },
    });

    return { success: true };
  }

  /**
   * Queries the organization's knowledge base using Prompt Guard, Vector Retrieval, and Groq LLM.
   */
  public static async queryKnowledge(params: {
    organizationId: string;
    query: string;
    topK?: number;
  }): Promise<
    RAGAnswerResponse & { isSafe: boolean; securityNotice?: string }
  > {
    const { organizationId, query, topK = 5 } = params;

    // 1. Run prompt through Meta Llama Prompt Guard 2
    const guardResult = await PromptGuardService.checkPrompt(query);
    if (!guardResult.isSafe) {
      return {
        answer:
          "Your query could not be processed due to safety constraints. Please rephrase your question regarding clinic services.",
        sources: [],
        isSafe: false,
        securityNotice:
          guardResult.reason || "Input flagged by security classifier.",
      };
    }

    // 2. Perform organization-isolated vector search
    const retrievedChunks = await RetrievalService.search({
      organizationId,
      query,
      topK,
    });

    // 3. Delimit context into safe XML blocks
    const contextXml = ContextBuilder.buildContext(retrievedChunks);

    // 4. Generate grounded answer via Groq LLM
    const ragResponse = await llmService.generateAnswer({
      question: query,
      contextXml,
      retrievedChunks,
    });

    return {
      ...ragResponse,
      isSafe: true,
    };
  }
}
