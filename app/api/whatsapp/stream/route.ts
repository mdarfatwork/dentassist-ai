import { NextRequest } from "next/server";
import { headers, cookies } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { getActiveOrganization } from "@/lib/auth/organization";
import { ACTIVE_ORG_COOKIE_NAME } from "@/lib/organization/cookies";
import { WhatsAppWorkerClient } from "@/lib/whatsapp/worker-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-Sent Events (SSE) Route Handler for real-time WhatsApp QR code & connection updates.
 * Authenticates user and organization membership on every connection.
 */
export async function GET(_req: NextRequest) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const cookieStore = await cookies();
  const activeOrgCookie =
    cookieStore.get(ACTIVE_ORG_COOKIE_NAME)?.value ?? null;
  const activeOrg = await getActiveOrganization(
    session.user.id,
    activeOrgCookie,
  );

  if (!activeOrg) {
    return new Response(
      JSON.stringify({ error: "Active organization required" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const organizationId = activeOrg.id;
  const encoder = new TextEncoder();

  let intervalId: NodeJS.Timeout | null = null;
  let isClosed = false;

  _req.signal.addEventListener("abort", () => {
    isClosed = true;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  });

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = async () => {
        if (isClosed) return;
        try {
          const status = await WhatsAppWorkerClient.getStatus(organizationId);
          if (isClosed) return;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(status.state)}\n\n`),
          );

          // If connected or failed, close the stream gracefully
          if (
            status.state.status === "CONNECTED" ||
            status.state.status === "FAILED"
          ) {
            isClosed = true;
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
            try {
              controller.close();
            } catch {
              // controller might already be closed
            }
          }
        } catch {
          // If error fetching status, continue polling
        }
      };

      // Send initial update immediately
      await sendUpdate();

      // Poll every 2 seconds while awaiting QR scan or connecting
      intervalId = setInterval(async () => {
        await sendUpdate();
      }, 2000);
    },
    cancel() {
      isClosed = true;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
