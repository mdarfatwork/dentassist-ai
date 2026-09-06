import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  resetPassword,
  sendVerificationEmail,
} = authClient;

export const requestPasswordReset = async (opts: {
  email: string;
  redirectTo?: string;
}) => {
  return authClient.$fetch<{ status: boolean }>("/request-password-reset", {
    method: "POST",
    body: opts,
  });
};
