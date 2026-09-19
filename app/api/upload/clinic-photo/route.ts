import { NextRequest, NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { auth } from "@/lib/auth/auth";
import {
  getActiveOrganization,
  requireOrganizationMembership,
} from "@/lib/auth/organization";
import { ACTIVE_ORG_COOKIE_NAME } from "@/lib/organization/cookies";
import {
  uploadBufferToS3,
  generateClinicStorageKey,
  getPresignedViewUrl,
  getPermanentStorageUrl,
  type StorageCategory,
} from "@/lib/storage/s3";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    const reqHeaders = await headers();
    const cookieStore = await cookies();

    // 1. Authenticate user
    const sessionData = await auth.api.getSession({
      headers: reqHeaders,
    });

    if (!sessionData?.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 },
      );
    }

    const { user } = sessionData;

    // 2. Parse Multipart Form Data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const requestedOrgId = formData.get("organizationId") as string | null;
    const folder = (formData.get("folder") as StorageCategory) || "photos";

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided." },
        { status: 400 },
      );
    }

    // 3. Resolve & verify organization membership
    let targetOrgId = requestedOrgId;
    if (!targetOrgId) {
      const activeCookie =
        cookieStore.get(ACTIVE_ORG_COOKIE_NAME)?.value ?? null;
      const activeOrg = await getActiveOrganization(user.id, activeCookie);
      targetOrgId = activeOrg?.id ?? null;
    }

    if (!targetOrgId) {
      return NextResponse.json(
        { error: "No active organization found." },
        { status: 400 },
      );
    }

    // Role check: Only OWNER or ADMIN may upload clinic assets
    const { organization, role } = await requireOrganizationMembership(
      user.id,
      targetOrgId,
    );

    if (role !== "OWNER" && role !== "ADMIN") {
      return NextResponse.json(
        {
          error:
            "Permission denied. Only clinic owners and admins can upload clinic assets.",
        },
        { status: 403 },
      );
    }

    // 4. Validate MIME type and file size
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Allowed formats: PNG, JPEG, WebP, and SVG.",
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit." },
        { status: 400 },
      );
    }

    // 5. Read binary content & upload to S3
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const s3Key = generateClinicStorageKey({
      organizationId: organization.id,
      folder,
      filename: file.name,
    });

    await uploadBufferToS3({
      key: s3Key,
      body: buffer,
      contentType: file.type,
    });

    // 6. Generate non-expiring permanent storage URL and 7-day presigned URL
    const permanentUrl = getPermanentStorageUrl(s3Key);
    const presignedUrl = await getPresignedViewUrl({
      key: s3Key,
      expiresInSeconds: 604800,
    });

    return NextResponse.json({
      success: true,
      key: s3Key,
      url: permanentUrl,
      viewUrl: presignedUrl,
      filename: file.name,
      size: file.size,
      contentType: file.type,
    });
  } catch (error) {
    console.error("Failed to upload clinic asset to S3:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error during upload.",
      },
      { status: 500 },
    );
  }
}
