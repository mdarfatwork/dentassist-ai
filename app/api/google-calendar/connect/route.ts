import { NextRequest, NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { ACTIVE_ORG_COOKIE_NAME } from "@/lib/organization/cookies";
import { getActiveOrganization } from "@/lib/auth/organization";
import { buildGoogleAuthUrl } from "@/lib/calendar/google-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const reqHeaders = await headers();
    const cookieStore = await cookies();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session?.user) {
      const loginUrl = new URL("/login", req.url);
      return NextResponse.redirect(loginUrl);
    }

    const activeOrgCookie =
      cookieStore.get(ACTIVE_ORG_COOKIE_NAME)?.value ?? null;
    const activeOrg = await getActiveOrganization(
      session.user.id,
      activeOrgCookie,
    );

    if (!activeOrg) {
      return new NextResponse(
        "No active organization found. Please create or select a clinic first.",
        { status: 400 },
      );
    }

    // Only OWNER or ADMIN can connect Google Calendar
    if (activeOrg.role !== "OWNER" && activeOrg.role !== "ADMIN") {
      return new NextResponse(
        "Forbidden: Only clinic owners and administrators can connect Google Calendar.",
        { status: 403 },
      );
    }

    const authUrl = buildGoogleAuthUrl(activeOrg.id, session.user.id);
    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    console.error("[GoogleCalendarConnect] Error starting OAuth:", err);
    const message =
      err instanceof Error
        ? err.message
        : "Failed to start Google Calendar OAuth.";
    return new NextResponse(`OAuth Initialization Error: ${message}`, {
      status: 500,
    });
  }
}
