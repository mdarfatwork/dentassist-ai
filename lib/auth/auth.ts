import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";
import { env } from "@/config/env";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "@/lib/email/send-email";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.0.102:3000",
    "http://192.168.0.102",
    "http://192.168.*:*",
    "http://10.*:*",
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    async sendResetPassword({ user, url }) {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl: url,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, url }) {
      await sendVerificationEmail({
        to: user.email,
        name: user.name,
        verificationUrl: url,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
