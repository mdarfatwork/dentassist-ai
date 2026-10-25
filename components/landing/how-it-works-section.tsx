import { Building2, CalendarPlus, MessageSquareCode } from "lucide-react";

const STEPS = [
  {
    step: "01",
    title: "Set up your practice",
    description:
      "Create a practice account and configure your clinic details, practitioners, services, and operating hours.",
    detail:
      "Define chair time durations, working days, and emergency closure rules in your dashboard.",
    icon: Building2,
  },
  {
    step: "02",
    title: "Connect your knowledge and calendar",
    description: "Add relevant clinic documents and connect Google Calendar.",
    detail:
      "Upload clinic PDFs or guidance notes and authorize Google Calendar using secure OAuth.",
    icon: CalendarPlus,
  },
  {
    step: "03",
    title: "Let patients chat and request appointments",
    description:
      "Add the website chatbot to your site so patients can ask clinic-related questions and get help scheduling appointments.",
    detail:
      "Embed a simple JavaScript snippet onto your existing website to activate your AI receptionist.",
    icon: MessageSquareCode,
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 sm:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Simple 3-Step Process
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
            How DentAssist AI works for your practice
          </h2>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            From initial practice configuration to an active website chatbot,
            each step is transparent and straightforward for practice
            administrators.
          </p>
        </div>

        {/* Step Progression Grid */}
        <div className="mt-16 relative">
          {/* Subtle Horizontal Connector Line (Desktop only) */}
          <div
            className="hidden lg:block absolute top-12 left-16 right-16 h-0.5 bg-border/80 -z-0"
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.step}
                  className="flex flex-col items-start text-left bg-card rounded-2xl p-6 sm:p-7 border border-border/80 shadow-xs hover:border-primary/40 transition-colors"
                >
                  {/* Step Header with Icon & Index */}
                  <div className="flex items-center justify-between w-full mb-6">
                    <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <Icon className="size-5" />
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60">
                      Step {step.step}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold tracking-tight text-foreground">
                    {step.title}
                  </h3>

                  <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>

                  <div className="mt-5 pt-4 border-t border-border/50 text-xs text-stone-600 dark:text-stone-300 w-full leading-normal">
                    <span className="font-medium text-foreground">
                      Practice focus:{" "}
                    </span>
                    {step.detail}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
