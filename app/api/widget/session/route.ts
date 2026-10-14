import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { WidgetService } from "@/lib/widget/service";
import { isOriginAllowed } from "@/lib/widget/domain-validator";
import {
  widgetRateLimiter,
  WIDGET_RATE_LIMITS,
} from "@/lib/widget/rate-limiter";
import { getCorsHeaders } from "@/lib/widget/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSessionSchema = z.object({
  widgetId: z.string().trim().min(1, "widgetId is required"),
});

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = getCorsHeaders(origin);
  return new NextResponse(null, { status: 204, headers });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";

  // 1. Rate Limiting
  const rateLimit = widgetRateLimiter.check(
    `session:${ip}`,
    WIDGET_RATE_LIMITS.SESSION_PER_MINUTE,
    60000,
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many session requests. Please wait a moment." },
      {
        status: 429,
        headers: {
          ...getCorsHeaders(origin),
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  // 2. Parse and validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400, headers: getCorsHeaders(origin) },
    );
  }

  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || "Invalid request parameters.",
      },
      { status: 400, headers: getCorsHeaders(origin) },
    );
  }

  // 3. Resolve active widget
  const widget = await WidgetService.getActiveWidgetByPublicId(
    parsed.data.widgetId,
  );
  if (!widget) {
    return NextResponse.json(
      { error: "Widget not found or inactive." },
      { status: 404, headers: getCorsHeaders(origin) },
    );
  }

  // 4. Domain validation
  if (!isOriginAllowed(origin, widget.allowedDomains)) {
    return NextResponse.json(
      { error: "Origin not permitted by clinic policy." },
      { status: 403, headers: getCorsHeaders(origin, widget.allowedDomains) },
    );
  }

  // 5. Create visitor session
  try {
    const session = await WidgetService.createVisitorSession(
      parsed.data.widgetId,
    );
    return NextResponse.json(session, {
      status: 201,
      headers: getCorsHeaders(origin, widget.allowedDomains),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create session";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: getCorsHeaders(origin, widget.allowedDomains) },
    );
  }
}
