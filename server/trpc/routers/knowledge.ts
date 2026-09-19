import { router, organizationProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import {
  documentUploadSchema,
  updateMarkdownSchema,
  processDocumentSchema,
  retryDocumentSchema,
  deleteDocumentSchema,
  getDocumentSchema,
  queryKnowledgeSchema,
} from "@/lib/validations/knowledge";
import { KnowledgeService } from "@/lib/knowledge/service";
import { getCanonicalMarkdown } from "@/lib/knowledge/storage";

export const knowledgeRouter = router({
  /**
   * Lists all knowledge documents belonging to the active organization.
   */
  list: organizationProcedure.query(async ({ ctx }) => {
    return await db.document.findMany({
      where: {
        organizationId: ctx.organizationId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        organizationId: true,
        name: true,
        mimeType: true,
        sizeBytes: true,
        status: true,
        chunkCount: true,
        errorMessage: true,
        processedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }),

  /**
   * Retrieves a single document with its canonical Markdown content.
   */
  get: organizationProcedure
    .input(getDocumentSchema)
    .query(async ({ ctx, input }) => {
      const doc = await db.document.findFirst({
        where: {
          id: input.documentId,
          organizationId: ctx.organizationId,
        },
        include: {
          chunks: {
            orderBy: { chunkIndex: "asc" },
            take: 20, // Preview of first 20 chunks
          },
        },
      });

      if (!doc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found.",
        });
      }

      let markdownContent = "";
      if (doc.markdownStorageKey) {
        try {
          markdownContent = await getCanonicalMarkdown(doc.markdownStorageKey);
        } catch (err: unknown) {
          console.warn(
            `[KnowledgeRouter] Could not fetch canonical markdown for doc ${doc.id}:`,
            err,
          );
        }
      }

      return {
        ...doc,
        markdownContent,
      };
    }),

  /**
   * Uploads and extracts a document, storing original in S3 and moving to REVIEW.
   */
  upload: organizationProcedure
    .input(documentUploadSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Only clinic owners and admins can upload knowledge documents.",
        });
      }

      const buffer = Buffer.from(input.fileBase64, "base64");

      return await KnowledgeService.uploadDocument({
        organizationId: ctx.organizationId,
        filename: input.name,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        buffer,
      });
    }),

  /**
   * Updates the canonical Markdown for a document in REVIEW state.
   */
  updateMarkdown: organizationProcedure
    .input(updateMarkdownSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only clinic owners and admins can edit document Markdown.",
        });
      }

      return await KnowledgeService.updateMarkdown({
        organizationId: ctx.organizationId,
        documentId: input.documentId,
        markdown: input.markdown,
      });
    }),

  /**
   * Chunks, embeds, and indexes the canonical Markdown into Pinecone (READY state).
   */
  process: organizationProcedure
    .input(processDocumentSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only clinic owners and admins can process documents.",
        });
      }

      return await KnowledgeService.processDocument({
        organizationId: ctx.organizationId,
        documentId: input.documentId,
      });
    }),

  /**
   * Retries processing on a failed document.
   */
  retry: organizationProcedure
    .input(retryDocumentSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Only clinic owners and admins can retry document processing.",
        });
      }

      return await KnowledgeService.retryProcessing({
        organizationId: ctx.organizationId,
        documentId: input.documentId,
      });
    }),

  /**
   * Securely deletes a document and removes all vectors from Pinecone.
   */
  delete: organizationProcedure
    .input(deleteDocumentSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Only clinic owners and admins can delete knowledge documents.",
        });
      }

      return await KnowledgeService.deleteDocument({
        organizationId: ctx.organizationId,
        documentId: input.documentId,
      });
    }),

  /**
   * Queries the active organization's knowledge base using RAG.
   */
  query: organizationProcedure
    .input(queryKnowledgeSchema)
    .mutation(async ({ ctx, input }) => {
      return await KnowledgeService.queryKnowledge({
        organizationId: ctx.organizationId,
        query: input.query,
        topK: input.topK,
      });
    }),
});
