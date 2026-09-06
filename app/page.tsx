import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CalendarCheck,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";

export default async function HomePage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/10 selection:text-primary">
      {/* Top Navbar */}
      <header className="w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-xs shadow-primary/20">
            <Stethoscope className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight tracking-tight text-foreground flex items-center gap-1.5">
              DentAssist{" "}
              <span className="text-primary font-semibold text-xs px-1.5 py-0.5 rounded bg-primary/10">
                AI
              </span>
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">
              Intelligent Dental Receptionist
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {session?.user ? (
            <Link href="/dashboard">
              <Button className="h-9 gap-1.5">
                Go to Dashboard <ArrowRight className="size-4" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" className="h-9">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="h-9 gap-1.5">
                  Get Started <ArrowRight className="size-4" />
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-16 sm:py-24 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold mb-6 animate-fadeIn">
          <Sparkles className="size-3.5" /> Phase 1 Authentication Ready
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground max-w-3xl leading-[1.15]">
          The AI Receptionist for Modern Dental Clinics
        </h1>

        <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
          DentAssist AI answers patient phone calls, schedules appointments, and
          handles common clinic inquiries 24/7 with human-like clinical
          accuracy.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {session?.user ? (
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-11 px-8 font-semibold gap-2"
              >
                Open Dashboard <ArrowRight className="size-4" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/signup" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-11 px-8 font-semibold gap-2"
                >
                  Create Practice Account <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto h-11 px-6"
                >
                  Sign In to Clinic
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Value Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 w-full text-left">
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
              <PhoneCall className="size-5" />
            </div>
            <h3 className="font-semibold text-foreground text-base">
              24/7 AI Phone Answering
            </h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Zero missed calls. Natural voice conversations that convert
              callers into booked patients.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
              <CalendarCheck className="size-5" />
            </div>
            <h3 className="font-semibold text-foreground text-base">
              Automated Scheduling
            </h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Seamlessly integrates with your clinic calendar to book,
              reschedule, or cancel appointments.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
              <ShieldCheck className="size-5" />
            </div>
            <h3 className="font-semibold text-foreground text-base">
              HIPAA & SOC-2 Ready
            </h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Enterprise-grade encryption and access controls protecting
              sensitive patient data.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} DentAssist AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
