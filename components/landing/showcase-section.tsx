import { Stethoscope, Check } from "lucide-react";

export function ShowcaseSection() {
  return (
    <section className="py-16 sm:py-24 border-t border-border/70 bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Clinical & Operational Outcomes */}
          <div className="lg:col-span-5 flex flex-col items-start text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Patient Experience
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground leading-[1.15]">
              Helpful answers, grounded in your practice.
            </h2>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed">
              When patients visit your website with questions after hours or
              during busy clinic times, DentAssist AI greets them with
              practice-specific guidance and assists them with finding an
              appointment.
            </p>

            <div className="mt-8 space-y-4 w-full">
              <div className="flex items-start gap-3">
                <div className="size-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="size-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Explains treatments accurately
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-normal">
                    Details service descriptions, estimated chair time, and prep
                    steps using your clinic&apos;s verified service catalog.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="size-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="size-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Verifies calendar availability
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-normal">
                    Inspects clinic hours and connected Google Calendar events
                    to suggest open appointment slots that fit the patient.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="size-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="size-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Collects booking details
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-normal">
                    Guides patients to share their contact details and reason
                    for visit so your practice receives clean, organized
                    requests.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Illustrative Chat Mockup */}
          <div className="lg:col-span-7 flex flex-col items-center">
            {/* Widget Container Window */}
            <div className="w-full max-w-xl rounded-2xl border border-border/90 bg-card shadow-lg shadow-stone-900/5 overflow-hidden">
              {/* Widget Header */}
              <div className="bg-primary/95 text-primary-foreground px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-xs">
                    <Stethoscope className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold leading-tight">
                      Oakridge Dental Practice
                    </p>
                    <p className="text-[11px] text-white/80 flex items-center gap-1 leading-tight mt-0.5">
                      <span className="size-1.5 rounded-full bg-emerald-400" />
                      Online Reception Assistant
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white/15 text-white/90">
                  Website Widget
                </span>
              </div>

              {/* Chat Conversation Body */}
              <div className="p-4 sm:p-6 space-y-4 bg-background/50 text-xs sm:text-sm">
                {/* Illustrative Notice Pill */}
                <div className="text-center">
                  <span className="inline-block text-[11px] text-muted-foreground bg-muted/80 px-2.5 py-0.5 rounded-full border border-border/50">
                    Illustrative demonstration • Fictional clinic scenario
                  </span>
                </div>

                {/* Patient Inquiry */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900 px-4 py-2.5 shadow-2xs">
                    <p>
                      Hello! Do you offer routine cleanings for new patients,
                      and do you have any openings this Friday morning?
                    </p>
                  </div>
                </div>

                {/* Bot Grounded Response */}
                <div className="flex justify-start items-start gap-2.5">
                  <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                    DA
                  </div>
                  <div className="max-w-[88%] rounded-2xl rounded-tl-xs bg-card border border-border p-3.5 shadow-2xs space-y-2 text-foreground">
                    <p className="leading-relaxed">
                      Hello! Yes, we welcome new patients for routine cleaning
                      and dental examinations (approximately 45 minutes with Dr.
                      Sarah Chen).
                    </p>
                    <p className="leading-relaxed">
                      Checking our clinic schedule for Friday, we currently have
                      the following appointment times open:
                    </p>
                    {/* Time Slot Choices */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 font-mono text-xs font-semibold">
                        09:30 AM
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 font-mono text-xs font-semibold">
                        11:15 AM
                      </span>
                    </div>
                  </div>
                </div>

                {/* Patient Follow-up */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900 px-4 py-2 shadow-2xs">
                    <p>09:30 AM on Friday works great.</p>
                  </div>
                </div>

                {/* Bot Booking Assistance */}
                <div className="flex justify-start items-start gap-2.5">
                  <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                    DA
                  </div>
                  <div className="max-w-[88%] rounded-2xl rounded-tl-xs bg-card border border-border p-3.5 shadow-2xs text-foreground">
                    <p className="leading-relaxed">
                      Perfect. To reserve the 09:30 AM slot with Dr. Chen on
                      Friday, please share your full name, phone number, and
                      email address.
                    </p>
                  </div>
                </div>
              </div>

              {/* Widget Footer Note */}
              <div className="bg-muted/40 border-t border-border/70 px-4 py-2.5 text-center text-[11px] text-muted-foreground">
                All responses strictly adhere to your clinic&apos;s configured
                information and Google Calendar rules.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
