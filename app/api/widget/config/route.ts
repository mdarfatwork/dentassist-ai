import { NextRequest, NextResponse } from "next/server";
import { WidgetService } from "@/lib/widget/service";
import { isOriginAllowed } from "@/lib/widget/domain-validator";
import {
  widgetRateLimiter,
  WIDGET_RATE_LIMITS,
} from "@/lib/widget/rate-limiter";
import { getCorsHeaders } from "@/lib/widget/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = getCorsHeaders(origin);
  return new NextResponse(null, { status: 204, headers });
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";

  // 1. Rate Limiting
  const rateLimit = widgetRateLimiter.check(
    `config:${ip}`,
    WIDGET_RATE_LIMITS.CONFIG_PER_MINUTE,
    60000,
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      {
        status: 429,
        headers: {
          ...getCorsHeaders(origin),
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  // 2. Extract and validate widgetId
  const { searchParams } = new URL(req.url);
  const widgetId = searchParams.get("widgetId")?.trim();

  if (!widgetId) {
    return NextResponse.json(
      { error: "Missing widgetId parameter." },
      { status: 400, headers: getCorsHeaders(origin) },
    );
  }

  // 3. Resolve active widget server-side
  const widget = await WidgetService.getActiveWidgetByPublicId(widgetId);
  if (!widget) {
    return NextResponse.json(
      { error: "Widget not found or currently inactive." },
      { status: 404, headers: getCorsHeaders(origin) },
    );
  }

  // 4. Domain check
  if (!isOriginAllowed(origin, widget.allowedDomains)) {
    return NextResponse.json(
      { error: "Origin not permitted by clinic policy." },
      { status: 403, headers: getCorsHeaders(origin, widget.allowedDomains) },
    );
  }

  // 5. Return sanitized public config
  const publicConfig = WidgetService.formatPublicConfig(widget);
  return NextResponse.json(publicConfig, {
    status: 200,
    headers: {
      ...getCorsHeaders(origin, widget.allowedDomains),
      "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
    },
  });
}
