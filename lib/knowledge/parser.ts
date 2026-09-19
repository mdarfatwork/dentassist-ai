import { getErrorMessage } from "../storage/s3";
import { MarkdownNormalizer } from "./normalizer";

export interface ParsedDocumentResult {
  text: string;
  markdown: string;
  pageCount: number;
}

interface PDFParseResult {
  text?: string;
  total?: number;
  pages?: unknown[];
  numpages?: number;
}

interface PDFParserInstance {
  getText: () => Promise<PDFParseResult>;
  destroy?: () => Promise<void> | void;
}

interface PDFParserConstructor {
  new (options: { data: Buffer }): PDFParserInstance;
  setWorker?: (worker: unknown) => void;
}

/**
 * DocumentProcessor
 * Extracts text content from PDF, DOCX, TXT, and MD files and normalizes it to canonical Markdown.
 */
export class DocumentProcessor {
  /**
   * Main entry point: validates and parses an uploaded file buffer.
   */
  public static async process(params: {
    buffer: Buffer;
    mimeType: string;
    filename: string;
  }): Promise<ParsedDocumentResult> {
    const { buffer, mimeType, filename } = params;

    if (!buffer || buffer.length === 0) {
      throw new Error("Cannot process an empty file.");
    }

    const lowerName = filename.toLowerCase();

    // 1. PDF Processing
    if (mimeType === "application/pdf" || lowerName.endsWith(".pdf")) {
      return await this.processPdf(buffer);
    }

    // 2. DOCX Processing
    if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      lowerName.endsWith(".docx")
    ) {
      return await this.processDocx(buffer);
    }

    // 3. Markdown Processing
    if (
      mimeType === "text/markdown" ||
      lowerName.endsWith(".md") ||
      lowerName.endsWith(".markdown")
    ) {
      const rawText = buffer.toString("utf-8");
      const normalized = MarkdownNormalizer.normalize(rawText);
      return {
        text: rawText,
        markdown: normalized,
        pageCount: 1,
      };
    }

    // 4. Plain Text Processing
    if (mimeType === "text/plain" || lowerName.endsWith(".txt")) {
      const rawText = buffer.toString("utf-8");
      const structured = MarkdownNormalizer.textToMarkdown(rawText);
      return {
        text: rawText,
        markdown: structured,
        pageCount: 1,
      };
    }

    throw new Error(
      `Unsupported file format: ${mimeType || filename}. Supported types: PDF, DOCX, TXT, MD.`,
    );
  }

  private static async loadPdfModule(): Promise<unknown> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("pdf-parse");
    } catch {
      return await import("pdf-parse");
    }
  }

  private static initPdfWorker(PDFParseClass: PDFParserConstructor): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const workerModule = require("pdf-parse/worker") as
        { getData?: () => unknown } | undefined;
      if (
        typeof workerModule?.getData === "function" &&
        typeof PDFParseClass.setWorker === "function"
      ) {
        PDFParseClass.setWorker(workerModule.getData());
      }
    } catch {
      // Fallback if worker module cannot be loaded directly
    }
  }

  private static async parsePdfWithClass(
    PDFParseClass: PDFParserConstructor,
    buffer: Buffer,
  ): Promise<{ rawText: string; pageCount: number }> {
    this.initPdfWorker(PDFParseClass);

    const parser = new PDFParseClass({ data: buffer });
    try {
      const result = await parser.getText();
      const rawText = result.text || "";
      const pageCount = result.total || result?.pages?.length || 1;
      return { rawText, pageCount };
    } finally {
      if (typeof parser.destroy === "function") {
        await parser.destroy();
      }
    }
  }

  private static async parsePdfWithFunction(
    pdfModule: unknown,
    buffer: Buffer,
  ): Promise<{ rawText: string; pageCount: number }> {
    const candidate = pdfModule as
      | ((buf: Buffer) => Promise<PDFParseResult>)
      | { default?: (buf: Buffer) => Promise<PDFParseResult> }
      | undefined;
    const parseFn =
      typeof candidate === "function" ? candidate : candidate?.default;
    if (typeof parseFn !== "function") {
      throw new TypeError(
        "Unable to locate PDFParse constructor or parse function in pdf-parse module.",
      );
    }
    const pdfData = await parseFn(buffer);
    return {
      rawText: pdfData.text || "",
      pageCount: pdfData.numpages || 1,
    };
  }

  private static async extractPdfRawData(
    buffer: Buffer,
  ): Promise<{ rawText: string; pageCount: number }> {
    const pdfModule = await this.loadPdfModule();
    const typedModule = pdfModule as
      | {
          PDFParse?: PDFParserConstructor;
          default?: { PDFParse?: PDFParserConstructor };
        }
      | undefined;
    const PDFParseClass =
      typedModule?.PDFParse || typedModule?.default?.PDFParse;

    if (typeof PDFParseClass === "function") {
      return this.parsePdfWithClass(PDFParseClass, buffer);
    }

    return this.parsePdfWithFunction(pdfModule, buffer);
  }

  /**
   * Extracts text from a PDF buffer, annotating page breaks with <!-- PAGE X --> markers.
   */
  private static async processPdf(
    buffer: Buffer,
  ): Promise<ParsedDocumentResult> {
    try {
      const { rawText, pageCount } = await this.extractPdfRawData(buffer);

      if (rawText.trim().length === 0) {
        throw new Error(
          "The uploaded PDF does not contain extractable text. Scanned or image-only PDFs are not supported in V1.",
        );
      }

      const normalized = MarkdownNormalizer.textToMarkdown(rawText);

      return {
        text: rawText,
        markdown: normalized,
        pageCount,
      };
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      if (msg.includes("does not contain extractable text")) {
        throw err;
      }
      throw new Error(`Failed to extract PDF content: ${msg}`);
    }
  }

  /**
   * Extracts text/html from a DOCX buffer using mammoth and formats into Markdown.
   */
  private static async processDocx(
    buffer: Buffer,
  ): Promise<ParsedDocumentResult> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      const rawText = result.value || "";

      if (rawText.trim().length === 0) {
        throw new Error("The uploaded DOCX document is empty.");
      }

      const normalized = MarkdownNormalizer.textToMarkdown(rawText);

      return {
        text: rawText,
        markdown: normalized,
        pageCount: 1,
      };
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      throw new Error(`Failed to extract DOCX content: ${msg}`);
    }
  }
}
