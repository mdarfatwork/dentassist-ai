import assert from "node:assert";
import { MarkdownNormalizer } from "@/lib/knowledge/normalizer";
import { ChunkingService } from "@/lib/knowledge/chunker";

export async function runChunkingNormalizerTests() {
  console.log("▶ Running MarkdownNormalizer and ChunkingService tests...");

  // 1. Test Normalizer: Whitespace & Line endings
  const rawInput = "Line 1\r\n\r\n\r\n\r\nLine 2   \r\n";
  const normalized = MarkdownNormalizer.normalize(rawInput);
  assert.strictEqual(
    normalized,
    "Line 1\n\nLine 2",
    "Should normalize line endings and collapse excessive whitespace",
  );

  // 2. Test Normalizer: Script and HTML removal
  const maliciousInput =
    "# Clinic Policy\n<script>alert('xss')</script>\nClean content.";
  const sanitized = MarkdownNormalizer.normalize(maliciousInput);
  assert.ok(!sanitized.includes("<script>"), "Should strip script tags");
  assert.ok(
    sanitized.includes("Clean content."),
    "Should preserve clean content",
  );

  // 3. Test Normalizer: Page number artifacts
  const pageArtifactInput =
    "# Header\nPage 1 of 5\nBody content\n--- Page 2 ---\nMore content";
  const cleanedPage = MarkdownNormalizer.normalize(pageArtifactInput);
  assert.ok(
    !cleanedPage.includes("Page 1 of 5"),
    "Should strip page number lines",
  );
  assert.ok(
    !cleanedPage.includes("--- Page 2 ---"),
    "Should strip page boundary markers",
  );

  // 4. Test Text to Markdown formatting
  const plainText =
    "BRIGHT SMILE DENTAL\n\nSERVICES OFFERED\nDental cleaning takes 30 mins.\n\nPRICING\nFee is 1500.";
  const convertedMd = MarkdownNormalizer.textToMarkdown(plainText);
  assert.ok(
    convertedMd.includes("## SERVICES OFFERED") ||
      convertedMd.includes("# BRIGHT SMILE DENTAL"),
    "Should convert title-like lines into Markdown headings",
  );

  // 5. Test ChunkingService: Heading hierarchy & path preservation
  const sampleMarkdown = `# Bright Smile Dental

## Services

### Dental Cleaning
Dental cleaning takes approximately 30 minutes. It removes plaque and tartar.

### Root Canal Treatment
Root Canal Treatment takes approximately 60 minutes. It relieves acute toothache.

## Pricing

### Dental Cleaning
₹1,500 for standard prophylaxis.

### Root Canal Treatment
₹5,500 per canal.`;

  const chunks = ChunkingService.chunkMarkdown(sampleMarkdown, {
    targetChunkSize: 200,
    overlapTokens: 20,
  });

  assert.ok(
    chunks.length >= 4,
    `Expected at least 4 chunks, got ${chunks.length}`,
  );

  const cleaningServiceChunk = chunks.find((c) =>
    c.content.includes("plaque and tartar"),
  );
  assert.ok(cleaningServiceChunk, "Should find cleaning service chunk");
  assert.strictEqual(
    cleaningServiceChunk?.headingPath,
    "Bright Smile Dental > Services > Dental Cleaning",
    "Should correctly track heading hierarchy path",
  );

  const cleaningPriceChunk = chunks.find((c) =>
    c.content.includes("prophylaxis"),
  );
  assert.ok(cleaningPriceChunk, "Should find cleaning price chunk");
  assert.strictEqual(
    cleaningPriceChunk?.headingPath,
    "Bright Smile Dental > Pricing > Dental Cleaning",
    "Should correctly track heading hierarchy path for pricing",
  );

  // 6. Test ChunkingService: Oversized section splitting with overlap
  const largeSection =
    "## Long Guide\n\n" +
    "This is a detailed sentence describing clinical treatment procedures in great depth. ".repeat(
      40,
    );
  const largeChunks = ChunkingService.chunkMarkdown(largeSection, {
    targetChunkSize: 50,
    overlapTokens: 10,
  });

  assert.ok(
    largeChunks.length > 1,
    "Should split oversized section into multiple overlapping chunks",
  );
  assert.strictEqual(
    largeChunks[0].headingPath,
    "Long Guide",
    "Sub-chunks should preserve the section heading path",
  );

  console.log("✔ MarkdownNormalizer and ChunkingService tests PASSED!");
}

if (process.argv[1]?.includes("chunking-normalizer.test")) {
  runChunkingNormalizerTests().catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
}
