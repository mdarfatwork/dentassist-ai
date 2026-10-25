import { FileText, CalendarCheck, Settings2, Check } from "lucide-react";

export function ValuePropSection() {
  return (
    <section
      id="features"
      className="py-16 sm:py-24 border-t border-border/70 bg-card/40"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Practice-Grounded Capabilities
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
            Your clinic&apos;s information, ready to answer patient questions.
          </h2>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Every dental clinic operates differently. DentAssist AI connects
            your practice policies, treatment services, and live calendar so
            patients receive accurate answers and can request appointments
            according to your rules.
          </p>
        </div>

        {/* Editorial Layout: Asymmetrical Composition */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Pillar 1: Clinic-Specific Knowledge (Dominant Editorial Anchor - 7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-border/80 bg-card p-6 sm:p-8 flex flex-col justify-between shadow-xs">
            <div>
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                <FileText className="size-5" />
              </div>
              <span className="text-xs font-mono font-medium text-primary">
                01 • Grounded Answers
              </span>
              <h3 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Answer with clinic-specific knowledge
              </h3>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
                Patient questions shouldn&apos;t be answered with generic AI
                guesses. DentAssist AI answers strictly using your uploaded
                clinic documents, fee policies, procedure instructions, and
                office guidelines.
              </p>
            </div>

            {/* Illustrative Knowledge Architecture Sample */}
            <div className="mt-8 rounded-xl border border-border/70 bg-background/80 p-4 sm:p-5">
              <div className="text-xs font-semibold text-foreground mb-3 flex items-center justify-between">
                <span>Indexed Clinic Documents</span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Practice Isolation
                </span>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5 rounded-lg bg-card p-2.5 border border-border/60">
                  <div className="size-2 rounded-full bg-primary mt-1 shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground">
                      Office Policies & Insurance Guidelines
                    </span>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Explains accepted payment methods, insurance processing,
                      and cancellation policies.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 rounded-lg bg-card p-2.5 border border-border/60">
                  <div className="size-2 rounded-full bg-primary mt-1 shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground">
                      Pre-Appointment & Aftercare Instructions
                    </span>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Provides reliable guidance on fasting, recovery timelines,
                      and routine post-op questions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pillars 2 & 3: Scheduling & Organization (Stacked Secondary Columns - 5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-8 justify-between">
            {/* Pillar 2: Google Calendar Scheduling */}
            <div className="flex-1 rounded-2xl border border-border/80 bg-card p-6 sm:p-7 flex flex-col justify-between shadow-xs">
              <div>
                <div className="size-10 rounded-xl bg-brand-brown/10 text-brand-brown flex items-center justify-center mb-4">
                  <CalendarCheck className="size-5" />
                </div>
                <span className="text-xs font-mono font-medium text-brand-brown">
                  02 • Calendar Coordination
                </span>
                <h3 className="mt-1 text-lg sm:text-xl font-bold tracking-tight text-foreground">
                  Help patients schedule
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  The chatbot inspects your operating hours, practitioner
                  rosters, procedure durations, and real-time Google Calendar
                  availability to assist patients with booking appointments.
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-border/60 flex items-center gap-2 text-xs font-medium text-stone-700 dark:text-stone-300">
                <Check className="size-4 text-emerald-600 shrink-0" />
                <span>
                  Prevents scheduling outside configured practice hours
                </span>
              </div>
            </div>

            {/* Pillar 3: Centralized Clinic Organization */}
            <div className="flex-1 rounded-2xl border border-border/80 bg-card p-6 sm:p-7 flex flex-col justify-between shadow-xs">
              <div>
                <div className="size-10 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center mb-4">
                  <Settings2 className="size-5" />
                </div>
                <span className="text-xs font-mono font-medium text-stone-600 dark:text-stone-400">
                  03 • Clinic Administration
                </span>
                <h3 className="mt-1 text-lg sm:text-xl font-bold tracking-tight text-foreground">
                  Keep clinic information organized
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Manage dentists, dental hygienists, service catalogs, chair
                  durations, operating hours, and planned holiday closures from
                  one clean practice dashboard.
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-border/60 flex items-center gap-2 text-xs font-medium text-stone-700 dark:text-stone-300">
                <Check className="size-4 text-emerald-600 shrink-0" />
                <span>
                  One central source of truth across staff and chatbot
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
