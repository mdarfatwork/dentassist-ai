import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicPageShell } from "@/components/landing/public-page-shell";

export const metadata: Metadata = {
  title: "About DentAssist AI — AI Receptionist for Dental Practices",
  description:
    "Learn why DentAssist AI was built, how it solves front-desk overload for dental practices, and our practical approach to AI patient chat and calendar scheduling.",
  openGraph: {
    title: "About DentAssist AI — Purpose-Built Dental Reception",
    description:
      "Empowering dental practices with practice-grounded patient chat and Google Calendar appointment scheduling.",
  },
};

export default function AboutPage() {
  return (
    <PublicPageShell>
      {/* Hero Header */}
      <div className="border-b border-border/70 bg-card/40 py-12 sm:py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary mb-2">
            Our Purpose & Vision
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            Built for dental practices that value their patients’ time and their
            staff’s focus.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed">
            DentAssist AI is an autonomous clinical receptionist platform that
            helps independent dental practices manage routine patient inquiries
            and appointment scheduling with clarity, reliability, and precision.
          </p>
        </div>
      </div>

      {/* Main Narrative Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16">
        {/* Section 1: The Challenge in Dental Front Desks */}
        <section className="space-y-4">
          <span className="text-xs font-mono font-bold text-primary uppercase tracking-wider">
            01 • The Problem
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Front desks are caught between in-chair patient care and endless
            inquiries.
          </h2>
          <div className="text-sm sm:text-base text-muted-foreground leading-relaxed space-y-4">
            <p>
              In a busy dental practice, reception teams perform critical
              clinical workflows: welcoming arriving patients, processing
              treatment consents, coordinating with dental hygienists, and
              managing emergency arrivals.
            </p>
            <p>
              Simultaneously, phones ring constantly and website visitors have
              repetitive questions:{" "}
              <em>“Do you accept our dental insurance?”</em>,{" "}
              <em>“How long does a new patient cleaning take?”</em>,{" "}
              <em>“What should I do before my crown appointment?”</em>, and{" "}
              <em>“What times are open this Friday?”</em>
            </p>
            <p>
              When receptionists are interrupted by repetitive questions,
              in-clinic patients wait longer, staff face burnout, and
              prospective patients who visit your website after hours bounce to
              another clinic because no one was available to answer.
            </p>
          </div>
        </section>

        {/* Section 2: What DentAssist AI Does */}
        <section className="space-y-6">
          <div>
            <span className="text-xs font-mono font-bold text-primary uppercase tracking-wider">
              02 • The Solution
            </span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Practical automation grounded in your clinic’s actual rules.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-3">
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <FileText className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                AI Patient Chat Grounded in Clinic Documents
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Rather than generic internet AI responses, DentAssist AI is
                trained on your clinic&apos;s specific fee schedules, office
                policies, accepted payment methods, and pre-appointment
                guidelines. It delivers practice-verified answers 24/7.
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-3">
              <div className="size-10 rounded-xl bg-brand-brown/10 text-brand-brown flex items-center justify-center font-bold">
                <CalendarCheck className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                Google Calendar Appointment Scheduling
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Connect your clinic&apos;s Google Calendar with OAuth.
                DentAssist AI enforces your weekly hours, practitioner
                availability, buffer times, and treatment durations to offer
                open slots and assist patients through the reservation process.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Clinic-Specific Multi-Tenant Focus */}
        <section className="space-y-4 rounded-2xl border border-border/80 bg-muted/30 p-6 sm:p-8">
          <span className="text-xs font-mono font-bold text-primary uppercase tracking-wider">
            03 • Architecture Focus
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Dedicated multi-tenant separation for every practice.
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Every dental clinic is unique. DentAssist AI provides an isolated
            tenant environment for each clinic. Your practitioner roster, chair
            durations, holiday calendar, and indexed documents belong
            exclusively to your practice and are never cross-pollinated or
            visible to other clinics.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs font-medium text-stone-700 dark:text-stone-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary shrink-0" />
              <span>Independent practice profiles</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary shrink-0" />
              <span>Isolated document indexing</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary shrink-0" />
              <span>Dedicated calendar connection</span>
            </div>
          </div>
        </section>

        {/* Section 4: Human Oversight & Clinical Philosophy */}
        <section className="space-y-4">
          <span className="text-xs font-mono font-bold text-primary uppercase tracking-wider">
            04 • Our Principles
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Assistive technology, not a replacement for clinical care.
          </h2>
          <div className="text-sm sm:text-base text-muted-foreground leading-relaxed space-y-4">
            <p>
              We believe artificial intelligence in healthcare should strictly
              assist administrative operations. DentAssist AI does not offer
              medical diagnoses, does not prescribe treatments, and does not
              replace the judgment of licensed dentists and clinic personnel.
            </p>
            <p>
              By automating repetitive routine questions and calendar
              availability checks, front-desk staff regain hours each day to
              focus on what matters most: human patient care, clinical comfort,
              and practice growth.
            </p>
          </div>
        </section>

        {/* Section 5: Closing CTA */}
        <section className="rounded-2xl border border-border/90 bg-card p-8 sm:p-10 text-center shadow-xs">
          <h3 className="text-xl sm:text-2xl font-bold text-foreground">
            Ready to give your reception team relief?
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
            Set up your practice profile, upload your clinic documents, and
            connect your Google Calendar in minutes.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup">
              <Button
                size="lg"
                className="h-10 px-6 gap-2 text-xs font-semibold"
              >
                Create Your Practice Account <ArrowRight className="size-3.5" />
              </Button>
            </Link>
            <Link href="/">
              <Button
                variant="outline"
                size="lg"
                className="h-10 px-5 text-xs font-medium"
              >
                Explore Features on Home
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </PublicPageShell>
  );
}
