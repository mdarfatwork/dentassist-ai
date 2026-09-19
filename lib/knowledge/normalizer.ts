/**
 * MarkdownNormalizer
 * Deterministically normalizes extracted text or user-supplied Markdown into canonical, structured Markdown.
 */
export class MarkdownNormalizer {
  /**
   * Cleans, structures, and normalizes raw text or Markdown into canonical Markdown.
   */
  public static normalize(input: string): string {
    if (!input || input.trim().length === 0) {
      return "";
    }

    let text = input;

    // 1. Normalize line endings (\r\n -> \n, \r -> \n)
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // 2. Remove null bytes and non-printable control characters (preserving \n, \t)
    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

    // 3. Remove raw HTML script/style/iframe tags
    text = text.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      "",
    );
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
    text = text.replace(
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      "",
    );

    // 4. Remove common repeated page numbers and footer artifacts (e.g. "Page 1 of 12", "--- Page 3 ---")
    text = text.replace(
      /^(?:---|___|\*\*\*)\s*page\s+\d+\s*(?:of\s+\d+)?\s*(?:---|___|\*\*\*)$/gim,
      "",
    );
    text = text.replace(/^[ \t]*page\s+\d+\s*(?:of\s+\d+)?[ \t]*$/gim, "");

    // 5. Standardize Markdown headings (ensure space after #)
    text = text.replace(/^(#{1,6})([^#\s])/gm, "$1 $2");

    // 6. Standardize unordered list markers (* or + -> -)
    text = text.replace(/^[ \t]*[\*\+](?=\s+)/gm, "-");

    // 7. Remove trailing spaces on each line
    text = text
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n");

    // 8. Collapse 3 or more consecutive empty lines into 2 empty lines
    text = text.replace(/\n{3,}/g, "\n\n");

    return text.trim();
  }

  /**
   * Formats plain text into structured Markdown paragraphs.
   */
  public static textToMarkdown(plainText: string): string {
    const normalized = this.normalize(plainText);
    const lines = normalized.split("\n");
    const formattedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if line looks like an all-caps or short title/heading
      const trimmed = line.trim();
      const isHeadingLike =
        trimmed.length > 0 &&
        trimmed.length < 60 &&
        !trimmed.endsWith(".") &&
        !trimmed.startsWith("-") &&
        !trimmed.startsWith("#") &&
        (trimmed === trimmed.toUpperCase() ||
          /^[A-Z0-9][\w\s&,/-]{2,50}:?$/.test(trimmed));

      if (isHeadingLike && i > 0 && lines[i - 1].trim() === "") {
        formattedLines.push(`## ${trimmed.replace(/:$/, "")}`);
      } else {
        formattedLines.push(line);
      }
    }

    return this.normalize(formattedLines.join("\n"));
  }
}
