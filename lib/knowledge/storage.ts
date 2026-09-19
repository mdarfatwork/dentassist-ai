import {
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import {
  s3Client,
  S3_BUCKET,
  resolveBucket,
  uploadBufferToS3,
  sanitizeFilename,
} from "@/lib/storage/s3";

export interface KnowledgeStorageLayout {
  originalKey: string;
  markdownKey: string;
}

/**
 * Builds the canonical isolated storage keys for a knowledge document.
 */
export function buildKnowledgeStorageKeys(params: {
  organizationId: string;
  documentId: string;
  filename: string;
}): KnowledgeStorageLayout {
  const sanitized = sanitizeFilename(params.filename);
  return {
    originalKey: `clinics/${params.organizationId}/knowledge/${params.documentId}/original/${sanitized}`,
    markdownKey: `clinics/${params.organizationId}/knowledge/${params.documentId}/content/content.md`,
  };
}

/**
 * Stores the raw original file (PDF, DOCX, TXT, MD) into isolated tenant S3 storage.
 */
export async function storeOriginalDocument(params: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<void> {
  await uploadBufferToS3({
    key: params.key,
    body: params.body,
    contentType: params.contentType,
  });
}

/**
 * Stores the canonical Markdown text for the document into S3.
 */
export async function storeCanonicalMarkdown(params: {
  key: string;
  markdown: string;
}): Promise<void> {
  const buffer = Buffer.from(params.markdown, "utf-8");
  await uploadBufferToS3({
    key: params.key,
    body: buffer,
    contentType: "text/markdown; charset=utf-8",
  });
}

/**
 * Retrieves the canonical Markdown text string from S3.
 */
export async function getCanonicalMarkdown(key: string): Promise<string> {
  const bucket = await resolveBucket(S3_BUCKET);
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  if (!response.Body) {
    throw new Error(`Document content not found at S3 key: ${key}`);
  }

  const bytes = await response.Body.transformToByteArray();
  return new TextDecoder("utf-8").decode(bytes);
}

/**
 * Downloads a file from S3 as a binary Buffer.
 */
export async function downloadS3Buffer(key: string): Promise<Buffer> {
  const bucket = await resolveBucket(S3_BUCKET);
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  if (!response.Body) {
    throw new Error(`Failed to retrieve file from S3 key: ${key}`);
  }

  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}

/**
 * Securely deletes all S3 objects under the document's folder.
 * Example prefix: clinics/{organizationId}/knowledge/{documentId}/
 */
export async function deleteDocumentS3Folder(params: {
  organizationId: string;
  documentId: string;
}): Promise<void> {
  const bucket = await resolveBucket(S3_BUCKET);
  const prefix = `clinics/${params.organizationId}/knowledge/${params.documentId}/`;

  try {
    const listRes = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
      }),
    );

    if (listRes.Contents && listRes.Contents.length > 0) {
      const objectsToDelete = listRes.Contents.map((obj) => ({
        Key: obj.Key,
      })).filter((obj): obj is { Key: string } => Boolean(obj.Key));

      if (objectsToDelete.length > 0) {
        await s3Client.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: objectsToDelete },
          }),
        );
      }
    }
  } catch (err: unknown) {
    console.warn(
      `[Knowledge Storage] Could not completely purge prefix ${prefix}:`,
      err instanceof Error ? err.message : err,
    );
  }
}
