export const ACTIVE_ORG_COOKIE_NAME = "dentassist_active_org";

export const ACTIVE_ORG_COOKIE_OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365, // 1 year
  sameSite: "lax" as const,
};

/**
 * Client-side helper to set active organization cookie.
 */
export function setActiveOrgCookie(organizationId: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${ACTIVE_ORG_COOKIE_NAME}=${encodeURIComponent(
    organizationId,
  )}; path=/; max-age=31536000; SameSite=Lax`;
}

/**
 * Client-side helper to read active organization cookie.
 */
export function getActiveOrgCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = new RegExp(`(?:^|; )${ACTIVE_ORG_COOKIE_NAME}=([^;]*)`).exec(
    document.cookie,
  );
  return match ? decodeURIComponent(match[1]) : null;
}
