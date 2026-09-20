import { NextRequest, NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { ACTIVE_ORG_COOKIE_NAME } from "@/lib/organization/cookies";
import { getActiveOrganization } from "@/lib/auth/organization";
import { streamReceptionistResponse } from "@/lib/receptionist/langchain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const reqHeaders = await headers();
    const cookieStore = await cookies();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session?.user) {
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized: Please sign in." }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const activeOrgCookie =
      cookieStore.get(ACTIVE_ORG_COOKIE_NAME)?.value ?? null;
    const activeOrg = await getActiveOrganization(
      session.user.id,
      activeOrgCookie,
    );

    if (!activeOrg) {
      return new NextResponse(
        JSON.stringify({
          error:
            "No active clinic found. Please select or create an organization.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json();
    const message = body.message;
    const conversationId = body.conversationId;

    if (!message || typeof message !== "string" || !message.trim()) {
      return new NextResponse(
        JSON.stringify({ error: "Message is required." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = streamReceptionistResponse({
            organizationId: activeOrg.id,
            conversationId,
            message,
          });

          for await (const event of generator) {
            const ssePayload = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(ssePayload));
          }
        } catch (err: unknown) {
          const errorMsg =
            err instanceof Error ? err.message : "Stream generation failure.";
          const errorPayload = `data: ${JSON.stringify({ type: "error", error: errorMsg })}\n\n`;
          controller.enqueue(encoder.encode(errorPayload));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Internal server error";
    return new NextResponse(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
