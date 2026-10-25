import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CalendarCheck,
  MessageSquare,
  ShieldCheck,
  Stethoscope,
  Clock,
  Layers,
  Bot,
} from "lucide-react";

export default async function HomePage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/10 selection:text-primary">
      {/* Top Navbar */}
      <header className="w-full border-b border-border bg-card sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-[3px] bg-primary flex items-center justify-center text-primary-foreground">
              <Stethoscope className="size-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-foreground">
                DentAssist
              </span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-[2px] bg-primary/10 text-primary border border-primary/20">
                AI
              </span>
              <span className="hidden sm:inline text-xs text-muted-foreground ml-2 pl-2 border-l border-border">
                Clinical Reception Operating System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {session?.user ? (
              <Link href="/dashboard">
                <Button size="sm" className="gap-1.5">
                  Go to Dashboard <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="gap-1.5">
                    Start Practice Setup <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section - Structured Editorial Clinical Presentation */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 sm:py-16 flex flex-col gap-12">
        {/* Main Banner */}
        <div className="border border-border bg-card rounded-[4px] p-8 sm:p-12 flex flex-col items-start text-left relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-[2px] border border-primary/20 bg-primary/5 text-primary text-xs font-semibold mb-4">
            <Bot className="size-3.5" /> Autonomous Reception Engine
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground max-w-3xl leading-[1.12]">
            High-Precision AI Reception for Dental Practices
          </h1>

          <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
            DentAssist AI engages patient inquiries via intelligent AI chat,
            qualifies triage criteria, and schedules appointments directly into
            your clinic management calendar with 24/7 clinical protocol
            compliance.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
            {session?.user ? (
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-9 px-5 gap-2 font-semibold"
                >
                  Open Clinic Portal <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/signup" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto h-9 px-5 gap-2 font-semibold"
                  >
                    Create Practice Account <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
                <Link href="/login" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto h-9 px-4"
                  >
                    Sign In to Portal
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Operational Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 border border-border divide-y md:divide-y-0 md:divide-x divide-border bg-card rounded-[4px]">
          <div className="p-6 space-y-2.5">
            <div className="size-8 rounded-[3px] bg-primary/10 text-primary flex items-center justify-center mb-3">
              <MessageSquare className="size-4" />
            </div>
            <div className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
              01 • Inbound Operations
            </div>
            <h3 className="font-bold text-foreground text-sm">
              24/7 Clinical Patient Triaging
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Autonomous conversational AI answering patient inquiries 24/7.
              Identifies emergency tooth pain, cosmetic inquiries, and routine
              cleanings.
            </p>
          </div>

          <div className="p-6 space-y-2.5">
            <div className="size-8 rounded-[3px] bg-primary/10 text-primary flex items-center justify-center mb-3">
              <CalendarCheck className="size-4" />
            </div>
            <div className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
              02 • Practice Scheduling
            </div>
            <h3 className="font-bold text-foreground text-sm">
              Calendar & Chair Slot Synchronization
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Direct two-way calendar sync. Enforces clinic working hours,
              practitioner specializations, buffer durations, and planned
              closures.
            </p>
          </div>

          <div className="p-6 space-y-2.5">
            <div className="size-8 rounded-[3px] bg-primary/10 text-primary flex items-center justify-center mb-3">
              <ShieldCheck className="size-4" />
            </div>
            <div className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
              03 • Security & Compliance
            </div>
            <h3 className="font-bold text-foreground text-sm">
              Multi-Tenant Data Isolation
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every practice operates within a dedicated tenant barrier. Strict
              role-based access controls and audit trails protect patient
              information.
            </p>
          </div>
        </div>

        {/* Protocol Spec Strip */}
        <div className="border border-border rounded-[4px] bg-muted/20 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-7 rounded-[2px] bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Layers className="size-3.5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-foreground">
                Clinical Workflow Architecture
              </div>
              <div className="text-[11px] text-muted-foreground">
                Configured with working hours, dentist profiles, treatment
                catalog, and holiday calendar.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3 text-primary" /> Real-Time Latency &lt;
              800ms
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">HIPAA Architecture Ready</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 px-6 bg-card text-xs text-muted-foreground mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © {new Date().getFullYear()} DentAssist AI. Clinical Operations
            Workspace.
          </span>
          <span className="font-mono text-[11px]">
            System Status: Operational
          </span>
        </div>
      </footer>
    </div>
  );
}
