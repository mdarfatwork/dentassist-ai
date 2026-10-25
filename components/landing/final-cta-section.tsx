import Link from "next/link";
import { ArrowRight, CheckCircle2, Shield, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FinalCtaSectionProps {
  isAuthenticated?: boolean;
}

export function FinalCtaSection({
  isAuthenticated = false,
}: Readonly<FinalCtaSectionProps>) {
  return (
    <section className="py-16 sm:py-24 border-t border-border/70 bg-card/50 relative overflow-hidden">
      {/* Subtle warm ambient backdrop */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="rounded-3xl border border-border/90 bg-card p-8 sm:p-12 lg:p-16 text-center shadow-lg shadow-stone-900/5">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary mb-3">
            Start Your Practice Setup
          </span>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground max-w-2xl mx-auto leading-tight">
            Give your patients a clearer path to their next appointment.
          </h2>

          <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Configure your practice, connect Google Calendar, and get your AI
            receptionist ready for your website.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            {isAuthenticated ? (
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-11 px-7 gap-2 text-sm font-semibold shadow-sm"
                >
                  Open Clinic Dashboard <ArrowRight className="size-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/signup" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto h-11 px-7 gap-2 text-sm font-semibold shadow-sm"
                  >
                    Create Your Practice Account{" "}
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          {!isAuthenticated && (
            <p className="mt-4 text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
              >
                Sign in
              </Link>
            </p>
          )}

          {/* Trust Safeguard Highlights */}
          <div className="mt-10 pt-8 border-t border-border/60 flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs text-stone-600 dark:text-stone-300">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" />
              Multi-tenant practice isolation
            </span>
            <span className="flex items-center gap-2">
              <CalendarCheck className="size-4 text-primary" />
              Google Calendar integration
            </span>
            <span className="flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              Encrypted OAuth credentials
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
