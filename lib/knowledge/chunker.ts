import { env } from "@/config/env";

export interface SemanticChunk {
  chunkIndex: number;
  content: string;
  headingPath: string | null;
  pageNumber: number | null;
}

export interface ChunkingOptions {
  targetChunkSize?: number; // Approximate token count
  overlapTokens?: number;
}

/**
 * Structure-aware, heading-preserving Markdown Chunking Service.
 */
export class ChunkingService {
  // Approximate character-to-token ratio (typically ~4 chars per token in English)
  private static readonly CHARS_PER_TOKEN = 4;

  /**
   * Chunks canonical Markdown into semantic, heading-aware chunks.
   */
  public static chunkMarkdown(
    markdown: string,
    options?: ChunkingOptions,
  ): SemanticChunk[] {
    const targetChars =
      (options?.targetChunkSize ?? env.RAG_CHUNK_SIZE ?? 600) *
      ChunkingService.CHARS_PER_TOKEN;
    const overlapChars =
      (options?.overlapTokens ?? env.RAG_CHUNK_OVERLAP ?? 80) *
      ChunkingService.CHARS_PER_TOKEN;

    const sections = this.parseSections(markdown);
    const chunks: SemanticChunk[] = [];
    let chunkIndex = 0;

    for (const section of sections) {
      const headingPathStr =
        section.headingPath.length > 0 ? section.headingPath.join(" > ") : null;

      const sectionText = section.content.trim();
      if (!sectionText) continue;

      if (sectionText.length <= targetChars) {
        // Section fits comfortably inside a single chunk
        chunks.push({
          chunkIndex: chunkIndex++,
          content: sectionText,
          headingPath: headingPathStr,
          pageNumber: section.pageNumber,
        });
      } else {
        // Section is oversized, split with controlled overlap at paragraph/sentence boundaries
        const subChunks = this.splitOversizedText(
          sectionText,
          targetChars,
          overlapChars,
        );

        for (const sub of subChunks) {
          if (sub.trim().length > 0) {
            chunks.push({
              chunkIndex: chunkIndex++,
              content: sub.trim(),
              headingPath: headingPathStr,
              pageNumber: section.pageNumber,
            });
          }
        }
      }
    }

    // Fallback if document had no recognizable sections or content was empty
    if (chunks.length === 0 && markdown.trim().length > 0) {
      chunks.push({
        chunkIndex: 0,
        content: markdown.trim(),
        headingPath: null,
        pageNumber: 1,
      });
    }

    return chunks;
  }

  /**
   * Parses Markdown into structural sections based on Markdown headers (#, ##, ###).
   */
  private static parseSections(markdown: string): Array<{
    headingPath: string[];
    content: string;
    pageNumber: number | null;
  }> {
    const lines = markdown.split("\n");
    const sections: Array<{
      headingPath: string[];
      content: string;
      pageNumber: number | null;
    }> = [];

    // Track heading hierarchy: [level1, level2, level3...]
    const headingStack: Array<{ level: number; title: string }> = [];
    let currentContent: string[] = [];
    let currentPage: number | null = 1;

    for (const line of lines) {
      // Check for explicit page markers inserted during extraction (e.g. <!-- PAGE 2 -->)
      const pageMatch = line.match(/<!--\s*PAGE\s+(\d+)\s*-->/i);
      if (pageMatch) {
        currentPage = parseInt(pageMatch[1], 10);
        continue;
      }

      // Check for markdown headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headingMatch) {
        // If we have accumulated content before this heading, store it as a section
        if (currentContent.join("").trim().length > 0) {
          sections.push({
            headingPath: headingStack.map((h) => h.title),
            content: currentContent.join("\n"),
            pageNumber: currentPage,
          });
          currentContent = [];
        }

        const level = headingMatch[1].length;
        const title = headingMatch[2].trim();

        // Pop headings at same or deeper level
        while (
          headingStack.length > 0 &&
          headingStack[headingStack.length - 1].level >= level
        ) {
          headingStack.pop();
        }

        headingStack.push({ level, title });
        currentContent.push(line);
      } else {
        currentContent.push(line);
      }
    }

    if (currentContent.join("").trim().length > 0) {
      sections.push({
        headingPath: headingStack.map((h) => h.title),
        content: currentContent.join("\n"),
        pageNumber: currentPage,
      });
    }

    return sections;
  }

  /**
   * Splits an oversized text into smaller overlapping chunks preserving sentences.
   */
  private static splitOversizedText(
    text: string,
    targetChars: number,
    overlapChars: number,
  ): string[] {
    const paragraphs = text.split(/\n\n+/);
    const result: string[] = [];
    let currentBuffer = "";

    for (const para of paragraphs) {
      if ((currentBuffer + "\n\n" + para).length <= targetChars) {
        currentBuffer = currentBuffer ? currentBuffer + "\n\n" + para : para;
      } else {
        if (currentBuffer.length > 0) {
          result.push(currentBuffer);
          // Apply overlap from the end of currentBuffer
          const overlap = currentBuffer.slice(-overlapChars);
          currentBuffer = overlap + "\n\n" + para;
        } else {
          // A single paragraph is larger than targetChars, split at sentence level
          const sentences = para.split(/(?<=[.!?])\s+/);
          let sentenceBuffer = "";

          for (const sentence of sentences) {
            if ((sentenceBuffer + " " + sentence).length <= targetChars) {
              sentenceBuffer = sentenceBuffer
                ? sentenceBuffer + " " + sentence
                : sentence;
            } else {
              if (sentenceBuffer.length > 0) {
                result.push(sentenceBuffer);
                sentenceBuffer =
                  sentenceBuffer.slice(-overlapChars) + " " + sentence;
              } else {
                // Single sentence exceeds targetChars, force hard break
                result.push(sentence.slice(0, targetChars));
                sentenceBuffer = sentence.slice(targetChars - overlapChars);
              }
            }
          }

          if (sentenceBuffer.trim().length > 0) {
            currentBuffer = sentenceBuffer;
          }
        }
      }
    }

    if (currentBuffer.trim().length > 0) {
      result.push(currentBuffer);
    }

    return result;
  }
}
