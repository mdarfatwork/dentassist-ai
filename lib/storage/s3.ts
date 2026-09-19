import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListBucketsCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/config/env";
import crypto from "node:crypto";

const globalForS3 = globalThis as unknown as {
  s3Client: S3Client | undefined;
};

/**
 * Singleton S3Client instance configured for S3-compatible object storage (e.g. Neon Object Storage, MinIO, AWS S3).
 * Note: forcePathStyle: true is essential for S3-compatible endpoints.
 */
export const s3Client =
  globalForS3.s3Client ??
  new S3Client({
    endpoint: env.AWS_ENDPOINT_URL_S3 || undefined,
    region: env.AWS_REGION || "us-east-2",
    credentials:
      env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
    forcePathStyle: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForS3.s3Client = s3Client;
}

export const S3_BUCKET = env.AWS_S3_BUCKET_NAME || "assets";

let cachedResolvedBucket: string | null = null;

/**
 * Resolves the active bucket name. Verifies if the target bucket exists,
 * automatically creates it if needed, or falls back to an available bucket.
 */
export async function resolveBucket(targetBucket = S3_BUCKET): Promise<string> {
  if (cachedResolvedBucket) {
    return cachedResolvedBucket;
  }

  try {
    const listRes = await s3Client.send(new ListBucketsCommand({}));
    const buckets = listRes.Buckets?.map((b) => b.Name).filter(Boolean) as
      string[] | undefined;

    if (buckets?.includes(targetBucket)) {
      cachedResolvedBucket = targetBucket;
      return targetBucket;
    }

    // Attempt to create the specified bucket if it does not exist yet
    try {
      await s3Client.send(new CreateBucketCommand({ Bucket: targetBucket }));
      cachedResolvedBucket = targetBucket;
      return targetBucket;
    } catch (createErr: unknown) {
      // If creation failed but buckets already exist, use the first available bucket
      if (buckets && buckets.length > 0) {
        cachedResolvedBucket = buckets[0];
        return buckets[0];
      }
      console.warn(
        "[S3 Storage] Failed to create bucket:",
        createErr instanceof Error ? createErr.message : createErr,
      );
    }
  } catch (listErr: unknown) {
    console.warn(
      "[S3 Storage] Could not list buckets:",
      listErr instanceof Error ? listErr.message : listErr,
    );
  }

  cachedResolvedBucket = targetBucket;
  return targetBucket;
}

/**
 * Sanitizes a filename by removing path traversal characters and keeping safe alphanumeric characters and extensions.
 */
export function sanitizeFilename(filename: string): string {
  const parts = filename.split(".");
  const ext = parts.length > 1 ? (parts.pop()?.toLowerCase() ?? "") : "";
  const base = parts.join(".");
  const sanitizedBase = base
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);

  return ext ? `${sanitizedBase}.${ext}` : sanitizedBase;
}

export type StorageCategory = "photos" | "logo" | "documents";

/**
 * Builds an isolated tenant storage key under the specified folder.
 * Example format: clinics/{organizationId}/photos/1726740000000-a1b2c3d4-exterior.jpg
 */
export function generateClinicStorageKey(params: {
  organizationId: string;
  folder?: StorageCategory;
  filename: string;
}): string {
  const folder = params.folder ?? "photos";
  const sanitized = sanitizeFilename(params.filename);
  const randomSuffix = crypto.randomUUID().slice(0, 8);
  const timestamp = Date.now();

  return `clinics/${params.organizationId}/${folder}/${timestamp}-${randomSuffix}-${sanitized}`;
}

/**
 * Safely extracts a readable error message from an unknown caught value.
 * Handles Error instances, strings, objects, and primitive values without
 * relying on default object stringification such as "[object Object]".
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }

  if (typeof err === "string") {
    return err;
  }

  if (err !== null && typeof err === "object") {
    if (
      "message" in err &&
      typeof (err as { message: unknown }).message === "string"
    ) {
      return (err as { message: string }).message;
    }

    try {
      return JSON.stringify(err);
    } catch {
      return "Unknown error";
    }
  }

  if (
    typeof err === "number" ||
    typeof err === "boolean" ||
    typeof err === "bigint"
  ) {
    return String(err);
  }

  return "Unknown error";
}

/**
 * Uploads a binary buffer directly to S3 with content type and bucket configuration.
 * Handles automatic bucket creation if the specified bucket does not exist yet.
 */
export async function uploadBufferToS3(params: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
  bucket?: string;
}): Promise<{ key: string; bucket: string }> {
  let bucket = await resolveBucket(params.bucket || S3_BUCKET);

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
      }),
    );
  } catch (err: unknown) {
    const errorMsg = getErrorMessage(err);
    const isNoSuchBucket =
      (err as { name?: string })?.name === "NoSuchBucket" ||
      errorMsg.includes("bucket does not exist") ||
      errorMsg.includes("The specified bucket does not exist");

    if (isNoSuchBucket) {
      console.log(
        `[S3 Storage] Bucket "${bucket}" does not exist. Creating and retrying...`,
      );
      try {
        await s3Client.send(new CreateBucketCommand({ Bucket: bucket }));
      } catch (createErr: unknown) {
        // If creating specific bucket fails, try discovering existing bucket
        const listRes = await s3Client.send(new ListBucketsCommand({}));
        const existing = listRes.Buckets?.[0]?.Name;
        if (existing) {
          bucket = existing;
          cachedResolvedBucket = existing;
        } else {
          throw createErr;
        }
      }

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: params.key,
          Body: params.body,
          ContentType: params.contentType,
        }),
      );
    } else {
      throw err;
    }
  }

  return {
    key: params.key,
    bucket,
  };
}

/**
 * Generates a signed view URL for retrieving or downloading an object from S3.
 * Default expiration is 7 days (604,800 seconds, the AWS SigV4 presigner limit).
 */
export async function getPresignedViewUrl(params: {
  key: string;
  expiresInSeconds?: number;
  bucket?: string;
}): Promise<string> {
  const bucket = await resolveBucket(params.bucket || S3_BUCKET);
  const expiresIn = Math.min(params.expiresInSeconds ?? 604800, 604800);

  return await getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: params.key,
    }),
    { expiresIn },
  );
}

/**
 * Generates a presigned PUT URL allowing clients to upload directly to S3 within a limited timeframe.
 */
export async function getPresignedUploadUrl(params: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
  bucket?: string;
}): Promise<{ uploadUrl: string; key: string; bucket: string }> {
  const bucket = await resolveBucket(params.bucket || S3_BUCKET);
  const expiresIn = params.expiresInSeconds ?? 900; // 15 minutes default

  const uploadUrl = await getSignedUrl(
    s3Client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      ContentType: params.contentType,
    }),
    { expiresIn },
  );

  return {
    uploadUrl,
    key: params.key,
    bucket,
  };
}

/**
 * Deletes an object from S3.
 */
export async function deleteObjectFromS3(params: {
  key: string;
  bucket?: string;
}): Promise<void> {
  const bucket = await resolveBucket(params.bucket || S3_BUCKET);

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: params.key,
    }),
  );
}

/**
 * Checks if an object exists and returns its metadata.
 */
export async function getObjectMetadata(params: {
  key: string;
  bucket?: string;
}) {
  const bucket = await resolveBucket(params.bucket || S3_BUCKET);

  return await s3Client.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: params.key,
    }),
  );
}

/**
 * Returns a permanent, non-expiring proxy URL for an S3 object key.
 * This route (/api/storage/[...key]) securely streams or redirects with fresh signed URLs.
 */
export function getPermanentStorageUrl(key: string): string {
  // Strip leading slash if any
  const cleanKey = key.startsWith("/") ? key.slice(1) : key;
  return `/api/storage/${cleanKey}`;
}
