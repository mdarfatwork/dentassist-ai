import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroMedia } from "./hero-media";

interface HeroSectionProps {
  isAuthenticated?: boolean;
}

export function HeroSection({
  isAuthenticated = false,
}: Readonly<HeroSectionProps>) {
  return (
    <section className="relative w-full overflow-hidden pt-8 pb-16 sm:pt-12 sm:pb-20 lg:pt-16 lg:pb-24">
      {/* Subtle warm decorative background gradient */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/8 via-background to-transparent -z-10 pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Messaging & CTAs (approx 52% on desktop) */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col items-start text-left">
            {/* Restrained Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold tracking-wide mb-6">
              <span className="size-1.5 rounded-full bg-primary" />
              <span>AI Receptionist for Dental Practices</span>
            </div>

            {/* Confident Display Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-extrabold tracking-tight text-foreground leading-[1.12]">
              More time for patients. Less time managing enquiries.
            </h1>

            {/* Supporting Copy */}
            <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
              DentAssist AI answers routine patient questions using your
              clinic&apos;s information and helps patients request appointments
              with Google Calendar scheduling.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              {isAuthenticated ? (
                <Link href="/dashboard" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto h-11 px-6 gap-2 text-sm font-semibold shadow-sm"
                  >
                    Open Clinic Dashboard <ArrowRight className="size-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/signup" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto h-11 px-6 gap-2 text-sm font-semibold shadow-sm"
                    >
                      Create Your Practice Account{" "}
                      <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                  <a href="#how-it-works" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto h-11 px-5 text-sm font-medium border-border/80 text-foreground hover:bg-muted/70"
                    >
                      See How It Works
                    </Button>
                  </a>
                </>
              )}
            </div>

            {/* Supporting Microcopy */}
            <p className="mt-4 text-xs text-muted-foreground/90 flex items-center gap-1.5">
              <span>
                Set up your clinic, connect Google Calendar, and configure your
                AI receptionist.
              </span>
            </p>

            {/* Core Capability Checklist */}
            <div className="mt-8 pt-6 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-700 dark:text-stone-300 w-full">
              <div className="flex items-center gap-2">
                <div className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold">✓</span>
                </div>
                <span>Website chat grounded in clinic docs</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold">✓</span>
                </div>
                <span>Direct Google Calendar availability check</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Media (approx 48% on desktop) */}
          <div className="lg:col-span-6 xl:col-span-6 w-full flex justify-center lg:justify-end">
            <HeroMedia />
          </div>
        </div>
      </div>
    </section>
  );
}
