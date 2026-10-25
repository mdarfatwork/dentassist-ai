import { Calendar, CheckCircle } from "lucide-react";

const SCHEDULING_STAGES = [
  {
    number: "01",
    title: "Clinic Operating Hours",
    description:
      "Validates against your practice's active weekly opening hours and planned holiday closures.",
    badge: "Hours & Closures",
  },
  {
    number: "02",
    title: "Practitioner & Procedure Time",
    description:
      "Accounts for assigned dentist availability, treatment chair duration, and required turnover buffer.",
    badge: "Duration Rules",
  },
  {
    number: "03",
    title: "Google Calendar Check",
    description:
      "Inspects existing calendar events via secure Google OAuth to identify open, unbooked intervals.",
    badge: "Real-Time Query",
  },
  {
    number: "04",
    title: "Direct Calendar Event",
    description:
      "Assists in booking confirmed slots and automatically creates the corresponding event in your Google Calendar.",
    badge: "Calendar Sync",
  },
];

export function SchedulingSection() {
  return (
    <section id="scheduling" className="py-16 sm:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Calendar Integration
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
            Appointment scheduling that respects your clinic&apos;s
            availability.
          </h2>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Double bookings and out-of-hours appointment requests frustrate both
            patients and front-desk teams. DentAssist AI connects directly with
            Google Calendar to check real-time availability before offering
            times.
          </p>
        </div>

        {/* 4-Step Verification Workflow */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SCHEDULING_STAGES.map((stage) => (
            <div
              key={stage.number}
              className="relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                    Step {stage.number}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {stage.badge}
                  </span>
                </div>

                <h3 className="text-base font-bold tracking-tight text-foreground">
                  {stage.title}
                </h3>

                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {stage.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-border/60 flex items-center gap-1.5 text-xs text-stone-700 dark:text-stone-300">
                <CheckCircle className="size-3.5 text-emerald-600 shrink-0" />
                <span>Automated rule validation</span>
              </div>
            </div>
          ))}
        </div>

        {/* Technical Boundary Callout Box */}
        <div className="mt-8 rounded-xl border border-border/70 bg-muted/30 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Calendar className="size-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                Google Calendar OAuth Integration
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connect your practice Google Calendar with read and write
                scheduling permissions. Tokens are encrypted at rest with
                AES-256.
              </p>
            </div>
          </div>

          <div className="text-xs font-mono text-muted-foreground shrink-0 bg-card px-3 py-1.5 rounded-md border border-border/60">
            Google Calendar API v3
          </div>
        </div>
      </div>
    </section>
  );
}
