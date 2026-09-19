import { NextRequest, NextResponse } from "next/server";
import { getPresignedViewUrl } from "@/lib/storage/s3";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ key: string[] }> },
) {
  try {
    const { key } = await props.params;

    if (!key || key.length === 0) {
      return NextResponse.json(
        { error: "Storage key is required." },
        { status: 400 },
      );
    }

    const s3Key = key.join("/");

    // Generate a fresh presigned URL valid for 24 hours
    const signedUrl = await getPresignedViewUrl({
      key: s3Key,
      expiresInSeconds: 86400,
    });

    // 307 Temporary Redirect with browser cache header to offload streaming directly to S3
    return NextResponse.redirect(signedUrl, {
      status: 307,
      headers: {
        "Cache-Control":
          "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Storage proxy error:", error);
    return NextResponse.json(
      { error: "Object not found or storage error." },
      { status: 404 },
    );
  }
}
