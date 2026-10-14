import { isOriginAllowed, normalizeOrigin } from "./domain-validator";

/**
 * Creates appropriate CORS headers based on request origin and widget allowedDomains.
 */
export function getCorsHeaders(
  requestOrigin: string | null | undefined,
  allowedDomains: string[] = [],
): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Widget-Id",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  if (!requestOrigin) {
    headers["Access-Control-Allow-Origin"] = "*";
    return headers;
  }

  const normalized = normalizeOrigin(requestOrigin);
  if (!normalized) {
    // Malformed origin
    return headers;
  }

  if (isOriginAllowed(requestOrigin, allowedDomains)) {
    headers["Access-Control-Allow-Origin"] = normalized;
  }

  return headers;
}
