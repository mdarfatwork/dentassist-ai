import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { MarketingHeader } from "@/components/landing/marketing-header";
import { HeroSection } from "@/components/landing/hero-section";
import { ValuePropSection } from "@/components/landing/value-prop-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { ShowcaseSection } from "@/components/landing/showcase-section";
import { SchedulingSection } from "@/components/landing/scheduling-section";
import { SecuritySection } from "@/components/landing/security-section";
import { FAQSection } from "@/components/landing/faq-section";
import { FinalCtaSection } from "@/components/landing/final-cta-section";
import { MarketingFooter } from "@/components/landing/marketing-footer";

export const metadata: Metadata = {
  title: "DentAssist AI — AI Receptionist for Dental Practices",
  description:
    "DentAssist AI answers routine patient inquiries using your clinic's documents and assists patients with booking appointments via Google Calendar.",
  openGraph: {
    title: "DentAssist AI — AI Receptionist for Dental Practices",
    description:
      "Website patient chat grounded in clinic information and appointment scheduling connected directly to Google Calendar.",
    type: "website",
  },
};

export default async function HomePage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });

  const isAuthenticated = Boolean(session?.user);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/15 selection:text-primary">
      {/* Accessible skip link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-md text-xs font-semibold"
      >
        Skip to main content
      </a>

      {/* Section A: Marketing Header */}
      <MarketingHeader isAuthenticated={isAuthenticated} />

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 flex flex-col">
        {/* Section B: High-Impact Hero */}
        <HeroSection isAuthenticated={isAuthenticated} />

        {/* Section C: Concise Value Proposition */}
        <ValuePropSection />

        {/* Section D: How It Works */}
        <HowItWorksSection />

        {/* Section E: Product Experience Showcase */}
        <ShowcaseSection />

        {/* Section F: Google Calendar Scheduling */}
        <SchedulingSection />

        {/* Section G: Trust, Privacy, and Security */}
        <SecuritySection />

        {/* Section H: Frequently Asked Questions */}
        <FAQSection />

        {/* Section I: Final Conversion Section */}
        <FinalCtaSection isAuthenticated={isAuthenticated} />
      </main>

      {/* Section J: Marketing Footer */}
      <MarketingFooter />
    </div>
  );
}
