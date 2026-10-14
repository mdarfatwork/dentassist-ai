/**
 * Domain and Origin Validation for Website Widget
 * Defense-in-depth utility for validating, sanitizing, and checking host origins.
 */

/**
 * Normalizes an origin or URL string into a canonical exact origin:
 * e.g., "https://brightsmile.com/" -> "https://brightsmile.com"
 * e.g., "http://localhost:3000" -> "http://localhost:3000"
 * Returns null if invalid or unsupported scheme.
 */
export function normalizeOrigin(input: string): string | null {
  if (!input || typeof input !== "string") return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    // If input doesn't have scheme, prepend https:// for parsing test, but require explicit scheme in allowlist
    const url = new URL(trimmed);

    // Allow https in all environments; allow http ONLY for localhost/127.0.0.1
    const isLocalhost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "[::1]";

    if (url.protocol === "http:") {
      if (!isLocalhost) {
        return null; // Production domains must use https
      }
    } else if (url.protocol !== "https:") {
      return null; // Unsupported scheme (ftp, javascript, file, etc.)
    }

    // Origin format: protocol://hostname[:port]
    return url.origin.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Checks if a given request origin matches the widget's allowed origins list.
 *
 * Rules:
 * - If allowedOrigins is empty:
 *   - In development: permits all origins.
 *   - In production: permits all origins if none configured (clinic has not restricted origins yet),
 *     or restricts strictly if allowedOrigins has entries.
 * - Exact-origin matching ONLY (no substring match like attacker-domain.com vs domain.com).
 * - Exact port matching for localhost.
 */
export function isOriginAllowed(
  requestOrigin: string | null | undefined,
  allowedDomains: string[],
): boolean {
  // If no domains are configured, allow by default (unrestricted clinic setup)
  if (!allowedDomains || allowedDomains.length === 0) {
    return true;
  }

  // If request origin is missing (e.g. server-to-server or non-browser request)
  if (!requestOrigin) {
    // Deliberate policy: allow server-to-server calls or requests without origin
    // as long as they have valid widgetId and session authentication.
    return true;
  }

  const normalizedRequest = normalizeOrigin(requestOrigin);
  if (!normalizedRequest) {
    return false;
  }

  for (const configured of allowedDomains) {
    const normalizedConfigured = normalizeOrigin(configured);
    if (normalizedConfigured && normalizedConfigured === normalizedRequest) {
      return true;
    }
  }

  return false;
}

/**
 * Validates a list of origins supplied by clinic administrator.
 * Throws an Error with descriptive message if any entry is invalid.
 */
export function validateAllowedDomainsList(domains: string[]): string[] {
  const normalizedList: string[] = [];
  const seen = new Set<string>();

  for (const raw of domains) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const normalized = normalizeOrigin(trimmed);
    if (!normalized) {
      throw new Error(
        `Invalid domain origin: "${trimmed}". Must be a valid origin (e.g., "https://example.com" or "http://localhost:3000"). HTTP is only allowed for localhost.`,
      );
    }

    if (!seen.has(normalized)) {
      seen.add(normalized);
      normalizedList.push(normalized);
    }
  }

  return normalizedList;
}
