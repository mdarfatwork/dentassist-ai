/**
 * Maps OAuth error codes from provider redirects and Better Auth into
 * user-friendly, non-technical error messages suitable for a dental SaaS.
 */
export function getFriendlyOAuthErrorMessage(
  errorCode: string | null | undefined,
  errorDescription?: string | null | undefined,
): string | null {
  if (!errorCode) return null;

  const code = errorCode.toLowerCase().trim();
  const desc = (errorDescription || "").toLowerCase().trim();

  // User cancellation or consent denial
  if (
    code === "access_denied" ||
    code === "user_denied" ||
    code === "cancelled" ||
    code === "canceled" ||
    desc.includes("denied") ||
    desc.includes("consent") ||
    desc.includes("cancelled") ||
    desc.includes("canceled")
  ) {
    return "Google sign-in was canceled. Please try again when you are ready to access your clinic workspace.";
  }

  // Session expiry or CSRF / state mismatch
  if (
    code === "state_mismatch" ||
    code === "invalid_state" ||
    code === "nonce_binding_missing" ||
    code === "state_security_mismatch"
  ) {
    return "Your authentication session timed out or was interrupted. Please try signing in again.";
  }

  // Account linking or conflict
  if (
    code === "account_already_linked_to_different_user" ||
    code === "unable_to_link_account"
  ) {
    return "This Google account is already linked to another practitioner profile. Please sign in with the correct account.";
  }

  // Profile or email missing from provider
  if (
    code === "unable_to_get_user_info" ||
    code === "no_email" ||
    code === "email_not_found"
  ) {
    return "DentAssist AI could not retrieve your account email from Google. Please ensure your Google account email is verified and accessible.";
  }

  // Invalid authorization code
  if (code === "invalid_code" || code === "no_code") {
    return "The authorization response from Google was invalid or expired. Please try signing in again.";
  }

  // Provider configuration error
  if (code === "oauth_provider_not_found") {
    return "Google OAuth authentication service is temporarily unavailable. Please contact clinic technical support.";
  }

  // Fallback for general OAuth failure
  return "Google authentication could not be completed. Please try again or contact clinic support.";
}
