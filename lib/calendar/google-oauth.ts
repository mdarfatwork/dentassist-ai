import crypto from "crypto";
import { db } from "@/lib/db";
import { encryptToken } from "./encryption";
import { CalendarDomainError } from "./types";

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.events.freebusy",
];

export interface OAuthStatePayload {
  organizationId: string;
  userId: string;
  timestamp: number;
  nonce: string;
}

function getOAuthSigningSecret(): string {
  return (
    process.env.BETTER_AUTH_SECRET ||
    process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY ||
    "dentassist-oauth-secret-fallback"
  );
}

function getGoogleClientId(): string {
  const clientId =
    process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new CalendarDomainError(
      "GOOGLE_CALENDAR_API_ERROR",
      "GOOGLE_CALENDAR_CLIENT_ID or GOOGLE_CLIENT_ID is not configured.",
    );
  }
  return clientId;
}

function getGoogleClientSecret(): string {
  const secret =
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) {
    throw new CalendarDomainError(
      "GOOGLE_CALENDAR_API_ERROR",
      "GOOGLE_CALENDAR_CLIENT_SECRET or GOOGLE_CLIENT_SECRET is not configured.",
    );
  }
  return secret;
}

export function getGoogleRedirectUri(): string {
  return (
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/google-calendar/callback`
  );
}

/**
 * Creates a cryptographically signed OAuth state parameter
 * Prevents CSRF, org switching, and unauthorized account linking.
 */
export function createOAuthState(
  organizationId: string,
  userId: string,
): string {
  const payload: OAuthStatePayload = {
    organizationId,
    userId,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString("hex"),
  };

  const payloadStr = JSON.stringify(payload);
  const hmac = crypto
    .createHmac("sha256", getOAuthSigningSecret())
    .update(payloadStr)
    .digest("hex");

  const stateObj = { p: payloadStr, s: hmac };
  return Buffer.from(JSON.stringify(stateObj)).toString("base64url");
}

/**
 * Validates the OAuth state parameter and returns the payload
 */
export function verifyOAuthState(
  stateStr: string,
  expectedUserId?: string,
): OAuthStatePayload {
  try {
    const raw = Buffer.from(stateStr, "base64url").toString("utf8");
    const parsed = JSON.parse(raw);
    const { p: payloadStr, s: signature } = parsed;

    const expectedHmac = crypto
      .createHmac("sha256", getOAuthSigningSecret())
      .update(payloadStr)
      .digest("hex");

    // Constant-time comparison
    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedHmac, "hex");

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      throw new CalendarDomainError(
        "INVALID_OAUTH_STATE",
        "OAuth state verification failed: Invalid signature.",
      );
    }

    const payload: OAuthStatePayload = JSON.parse(payloadStr);

    // State expiration: 15 minutes
    const now = Date.now();
    if (now - payload.timestamp > 15 * 60 * 1000) {
      throw new CalendarDomainError(
        "INVALID_OAUTH_STATE",
        "OAuth state has expired. Please initiate the connection again.",
      );
    }

    if (expectedUserId && payload.userId !== expectedUserId) {
      throw new CalendarDomainError(
        "INVALID_OAUTH_STATE",
        "OAuth state user mismatch.",
      );
    }

    return payload;
  } catch (err) {
    if (err instanceof CalendarDomainError) throw err;
    throw new CalendarDomainError(
      "INVALID_OAUTH_STATE",
      "Failed to parse OAuth state.",
    );
  }
}

/**
 * Builds the Google OAuth 2.0 authorization URL
 */
export function buildGoogleAuthUrl(
  organizationId: string,
  userId: string,
): string {
  const state = createOAuthState(organizationId, userId);
  const clientId = getGoogleClientId();
  const redirectUri = getGoogleRedirectUri();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_CALENDAR_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent", // Force Google to return a refresh token
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

/**
 * Exchanges Google OAuth authorization code for tokens
 */
export async function exchangeOAuthCode(
  code: string,
): Promise<GoogleTokenResponse> {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  const redirectUri = getGoogleRedirectUri();

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[GoogleOAuth] Code exchange failed:", errorText);
    throw new CalendarDomainError(
      "OAUTH_FAILED",
      "Failed to exchange authorization code with Google OAuth.",
    );
  }

  const data: GoogleTokenResponse = await response.json();
  return data;
}

/**
 * Fetches Google Account Email using the access token
 */
export async function fetchGoogleAccountEmail(
  accessToken: string,
): Promise<string | null> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      return data.email || null;
    }
  } catch (err) {
    console.warn("[GoogleOAuth] Failed to fetch userinfo email:", err);
  }
  return null;
}

/**
 * Saves or updates the Google Calendar connection in database with encrypted tokens
 */
export async function saveGoogleCalendarConnection(params: {
  organizationId: string;
  accessToken: string;
  refreshToken?: string;
  expiresInSeconds: number;
  scopes: string;
  googleAccountEmail?: string | null;
}) {
  const {
    organizationId,
    accessToken,
    refreshToken,
    expiresInSeconds,
    scopes,
    googleAccountEmail,
  } = params;

  const encryptedAccessToken = encryptToken(accessToken);
  const encryptedRefreshToken = refreshToken
    ? encryptToken(refreshToken)
    : undefined;
  const tokenExpiry = new Date(Date.now() + expiresInSeconds * 1000);

  const existing = await db.googleCalendarConnection.findUnique({
    where: { organizationId },
  });

  if (existing) {
    return await db.googleCalendarConnection.update({
      where: { organizationId },
      data: {
        accessToken: encryptedAccessToken,
        ...(encryptedRefreshToken
          ? { refreshToken: encryptedRefreshToken }
          : {}),
        tokenExpiry,
        scopes,
        googleAccountEmail: googleAccountEmail ?? existing.googleAccountEmail,
        status: "CONNECTED",
      },
    });
  }

  return await db.googleCalendarConnection.create({
    data: {
      organizationId,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken || null,
      tokenExpiry,
      scopes,
      googleAccountEmail: googleAccountEmail || null,
      status: "CONNECTED",
    },
  });
}
