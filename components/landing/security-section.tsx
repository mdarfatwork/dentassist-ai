import { Shield, KeyRound, Database, FileCheck } from "lucide-react";

const TRUST_SAFEGUARDS = [
  {
    icon: Database,
    title: "Multi-Tenant Data Separation",
    description:
      "Every dental practice operates within an isolated tenant partition. Clinic profile, practitioners, and appointment records are strictly bounded to your account.",
  },
  {
    icon: KeyRound,
    title: "Role-Based Access Controls",
    description:
      "Clinic staff access the dashboard via verified session authentication. Sensitive settings and calendar authorizations are protected against unauthorized access.",
  },
  {
    icon: FileCheck,
    title: "Isolated Knowledge Retrieval",
    description:
      "The AI receptionist only accesses documents and guidance notes uploaded specifically by your clinic, preventing leakage between different practices.",
  },
  {
    icon: Shield,
    title: "Encrypted Calendar Authorization",
    description:
      "Google OAuth tokens used for calendar scheduling are encrypted at rest using industry-standard AES-256 encryption within the database.",
  },
];

export function SecuritySection() {
  return (
    <section
      id="security"
      className="py-16 sm:py-24 border-t border-border/70 bg-card/40"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Data Architecture & Privacy
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
            Built with clinical-grade privacy and data separation.
          </h2>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Dental practices handle sensitive operational details and patient
            inquiries every day. DentAssist AI enforces strict multi-tenant
            isolation and verifiable security controls across every layer.
          </p>
        </div>

        {/* 4 Safeguards Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {TRUST_SAFEGUARDS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-border/80 bg-card p-6 sm:p-7 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
