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

const chatMessageSchema = z.object({
  widgetId: z.string().trim().min(1, "widgetId is required"),
  sessionToken: z.string().trim().min(1, "sessionToken is required"),
  message: z
    .string()
    .trim()
    .min(1, "Message cannot be empty.")
    .max(2000, "Message exceeds 2,000 character limit."),
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400, headers: getCorsHeaders(origin) },
    );
  }

  const parsed = chatMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid request payload." },
      { status: 400, headers: getCorsHeaders(origin) },
    );
  }

  const { widgetId, sessionToken, message } = parsed.data;

  // 1. Rate Limiting per session & per IP
  const rateLimit = widgetRateLimiter.check(
    `msg:${ip}:${sessionToken}`,
    WIDGET_RATE_LIMITS.MESSAGES_PER_MINUTE,
    60000,
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error:
          "Too many messages sent. Please wait a moment before sending another.",
      },
      {
        status: 429,
        headers: {
          ...getCorsHeaders(origin),
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  // 2. Resolve widget and verify session
  const verification = await WidgetService.verifyVisitorSession(
    widgetId,
    sessionToken,
  );
  if (!verification) {
    return NextResponse.json(
      { error: "Invalid, expired, or unauthorized visitor session." },
      { status: 401, headers: getCorsHeaders(origin) },
    );
  }

  const { widget } = verification;

  // 3. Domain Check
  if (!isOriginAllowed(origin, widget.allowedDomains)) {
    return NextResponse.json(
      { error: "Origin not permitted by clinic policy." },
      { status: 403, headers: getCorsHeaders(origin, widget.allowedDomains) },
    );
  }

  // 4. Invoke AI Core via WidgetService
  try {
    const receptionistResult = await WidgetService.processVisitorMessage({
      publicWidgetId: widgetId,
      sessionToken,
      message,
    });

    return NextResponse.json(
      {
        reply: receptionistResult.reply,
        conversationId: receptionistResult.conversationId,
        bookingState: receptionistResult.bookingState,
        sources: receptionistResult.sources,
        isSecurityFlagged: receptionistResult.isSecurityFlagged,
        securityNotice: receptionistResult.securityNotice,
      },
      {
        status: 200,
        headers: getCorsHeaders(origin, widget.allowedDomains),
      },
    );
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error
        ? err.message
        : "Internal conversation processing error";
    return NextResponse.json(
      { error: errorMsg },
      { status: 500, headers: getCorsHeaders(origin, widget.allowedDomains) },
    );
  }
}
