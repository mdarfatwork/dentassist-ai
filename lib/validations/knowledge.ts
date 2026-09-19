import { z } from "zod";

export const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
] as const;

export const SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"] as const;

export const documentUploadSchema = z.object({
  name: z
    .string()
    .min(1, "Document name is required")
    .max(255, "Document name must not exceed 255 characters"),
  mimeType: z.enum(SUPPORTED_MIME_TYPES, {
    message:
      "Unsupported file type. Please upload a PDF, DOCX, TXT, or MD file.",
  }),
  sizeBytes: z
    .number()
    .positive("File cannot be empty")
    .max(10 * 1024 * 1024, "File size must not exceed 10MB"),
  fileBase64: z.string().min(1, "File content is required"),
});

export const updateMarkdownSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
  markdown: z.string().min(1, "Markdown content cannot be empty"),
});

export const processDocumentSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
});

export const retryDocumentSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
});

export const deleteDocumentSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
});

export const getDocumentSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
});

export const queryKnowledgeSchema = z.object({
  query: z
    .string()
    .trim()
    .min(2, "Question must be at least 2 characters")
    .max(1000, "Question must not exceed 1000 characters"),
  topK: z.number().int().min(1).max(20).optional().default(5),
});

export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;
export type UpdateMarkdownInput = z.infer<typeof updateMarkdownSchema>;
export type QueryKnowledgeInput = z.infer<typeof queryKnowledgeSchema>;
