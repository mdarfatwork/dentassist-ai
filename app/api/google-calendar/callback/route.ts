import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { requireOrganizationMembership } from "@/lib/auth/organization";
import {
  verifyOAuthState,
  exchangeOAuthCode,
  fetchGoogleAccountEmail,
  saveGoogleCalendarConnection,
} from "@/lib/calendar/google-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;

  if (error) {
    console.warn("[GoogleCalendarCallback] Google returned error:", error);
    return NextResponse.redirect(
      new URL(`/dashboard?calendarError=${encodeURIComponent(error)}`, baseUrl),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/dashboard?calendarError=missing_params", baseUrl),
    );
  }

  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session?.user) {
      return NextResponse.redirect(
        new URL("/login?callbackUrl=/dashboard", baseUrl),
      );
    }

    // 1. Verify cryptographic state and user match
    const payload = verifyOAuthState(state, session.user.id);

    // 2. Verify user still has access to the organization
    await requireOrganizationMembership(
      session.user.id,
      payload.organizationId,
    );

    // 3. Exchange code for access & refresh tokens
    const tokenResponse = await exchangeOAuthCode(code);

    // 4. Fetch Google Account Email
    const accountEmail = await fetchGoogleAccountEmail(
      tokenResponse.access_token,
    );

    // 5. Store encrypted tokens in database
    await saveGoogleCalendarConnection({
      organizationId: payload.organizationId,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresInSeconds: tokenResponse.expires_in,
      scopes: tokenResponse.scope,
      googleAccountEmail: accountEmail,
    });

    console.log(
      `[GoogleCalendarCallback] Successfully linked Google Calendar for org: ${payload.organizationId}`,
    );

    return NextResponse.redirect(
      new URL("/dashboard?calendarConnected=true&selectCalendar=true", baseUrl),
    );
  } catch (err: unknown) {
    console.error("[GoogleCalendarCallback] OAuth callback error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to connect Google Calendar.";
    return NextResponse.redirect(
      new URL(
        `/dashboard?calendarError=${encodeURIComponent(message)}`,
        baseUrl,
      ),
    );
  }
}
