/**
 * Canonical Site URL and SEO metadata configuration for DentAssist AI.
 */

export function getSiteUrl(): string {
  // 1. Explicit production URL environment variable (when not localhost)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    const url = process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/+$/, "");
    if (!url.includes("localhost") && !url.includes("127.0.0.1")) {
      return url;
    }
  }

  // 2. Vercel production deployment domain
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim().replace(/\/+$/, "")}`;
  }

  // 3. Canonical production domain as established across the application
  return "https://dentassist.ai";
}

export const SITE_CONFIG = {
  name: "DentAssist AI",
  tagline: "AI Receptionist for Dental Practices",
  description:
    "DentAssist AI engages patient inquiries using clinic-specific documents and assists patients with booking appointments via Google Calendar.",
  url: getSiteUrl(),
  lastUpdated: new Date("2026-10-25T00:00:00.000Z"),
  routes: {
    home: "/",
    about: "/about",
    privacy: "/privacy",
    terms: "/terms",
    signup: "/signup",
    login: "/login",
  },
} as const;
