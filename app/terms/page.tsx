import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { PublicPageShell } from "@/components/landing/public-page-shell";
import { LEGAL_CONFIG } from "@/lib/legal/legal-config";

export const metadata: Metadata = {
  title: "Terms of Service — DentAssist AI",
  description:
    "DentAssist AI Terms of Service governing clinic subscriptions, acceptable use, medical disclaimers, AI limitations, and Google Calendar scheduling.",
  openGraph: {
    title: "DentAssist AI — Terms of Service",
    description:
      "Operational terms, medical disclaimers, and subscription conditions for dental practices using DentAssist AI.",
  },
};

export default function TermsOfServicePage() {
  return (
    <PublicPageShell>
      {/* Header Banner */}
      <div className="border-b border-border/70 bg-card/40 py-10 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary mb-2">
            Legal Agreement
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Terms of Service
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
            Effective Date: {LEGAL_CONFIG.effectiveDate} • Last Updated:{" "}
            {LEGAL_CONFIG.lastUpdatedDate}
          </p>
        </div>
      </div>

      {/* Main Document Body */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-12">
        {/* CRITICAL MEDICAL DISCLAIMER BANNER */}
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-xs sm:text-sm text-stone-800 dark:text-stone-200 flex items-start gap-3.5 shadow-xs">
          <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <span className="font-bold text-foreground uppercase tracking-wide text-xs">
              Essential Clinical & Medical Disclaimer
            </span>
            <p className="text-muted-foreground leading-relaxed">
              <strong>
                DentAssist AI is an administrative and scheduling software tool,
                not a licensed healthcare provider or medical device.
              </strong>{" "}
              DentAssist AI does not provide dental diagnoses, medical advice,
              treatment plans, or emergency clinical triage.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Patients experiencing severe oral emergencies, uncontrolled
              bleeding, facial trauma, or acute swelling compromising breathing
              must seek immediate emergency medical treatment or contact local
              emergency services (such as 911). Practice owners and their
              licensed clinicians remain solely responsible for all patient
              care, clinical evaluations, and treatment decisions.
            </p>
          </div>
        </div>

        {/* Section 1: Acceptance */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            1. Acceptance of Terms
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            These Terms of Service (“Terms”) constitute a legally binding
            agreement between {LEGAL_CONFIG.companyLegalName} (“DentAssist AI”,
            “we”, “our”, or “us”) and the dental practice or entity registering
            for, accessing, or using the DentAssist AI software platform
            (“Practice”, “Subscriber”, or “you”).
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            By creating a practice account, configuring clinic settings,
            connecting Google Calendar, or embedding the website widget, you
            agree to be bound by these Terms. If you are entering into these
            Terms on behalf of a dental clinic, you represent that you have
            authority to bind that entity.
          </p>
        </section>

        {/* Section 2: Description of Service */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            2. Description & Scope of Service
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            DentAssist AI provides software infrastructure designed for dental
            practices, featuring:
          </p>
          <ul className="list-disc pl-5 text-xs sm:text-sm text-muted-foreground space-y-1.5 leading-relaxed">
            <li>
              <strong className="text-foreground">AI Patient Chat:</strong> An
              embeddable website widget that answers routine patient questions
              using informational documents uploaded by the practice.
            </li>
            <li>
              <strong className="text-foreground">
                Google Calendar Scheduling:
              </strong>{" "}
              Automated availability checks matching configured practice hours
              and practitioner schedules against connected Google Calendar
              events to assist patients in booking appointments.
            </li>
            <li>
              <strong className="text-foreground">
                Practice Operations Portal:
              </strong>{" "}
              A multi-tenant dashboard to configure clinic details,
              practitioners, dental services, operating schedules, holiday
              closures, and uploaded knowledge documents.
            </li>
          </ul>
        </section>

        {/* Section 3: Account Registration & Security */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            3. Account Registration & User Security
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            You must provide accurate, current, and complete information during
            registration. You are responsible for maintaining the
            confidentiality of login credentials and for all activities that
            occur under your practice account. You agree to notify DentAssist AI
            immediately of any unauthorized access or security breach.
          </p>
        </section>

        {/* Section 4: Practice Responsibilities */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            4. Practice Responsibilities & Content Accuracy
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Practice owners and administrators bear sole responsibility for:
          </p>
          <ul className="list-disc pl-5 text-xs sm:text-sm text-muted-foreground space-y-1.5 leading-relaxed">
            <li>
              The truthfulness, legality, and clinical appropriateness of all
              uploaded knowledge documents, fees, insurance guidelines, and
              clinic instructions.
            </li>
            <li>
              Ensuring working hours, doctor assignments, and appointment
              durations accurately reflect real clinic capacity.
            </li>
            <li>
              Maintaining an active, authorized Google Calendar connection with
              valid permissions.
            </li>
            <li>
              Reviewing appointment requests and verifying patient intake
              details in accordance with clinical standards.
            </li>
            <li>
              Obtaining necessary patient consents for communication through
              your clinic website.
            </li>
          </ul>
        </section>

        {/* Section 5: AI-Generated Content & Limitations */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            5. AI-Generated Responses & Operational Limitations
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            DentAssist AI uses generative artificial intelligence grounded in
            your uploaded documents. While the system is engineered to restrict
            answers to verified clinic documents, artificial intelligence
            outputs are probabilistic. DentAssist AI does not warrant that AI
            responses will always be error-free or exhaustive. The practice must
            review and update its knowledge documents regularly to prevent
            out-of-date information from being communicated.
          </p>
        </section>

        {/* Section 6: Google Calendar & Availability */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            6. Calendar Integration & Availability Authority
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Availability calculations depend upon real-time queries to Google
            Calendar APIs and network connectivity. DentAssist AI cannot
            guarantee uninterrupted synchronization if Google APIs experience
            outages, if authorization tokens expire without re-authentication,
            or if external calendar events are edited outside the system.
          </p>
        </section>

        {/* Section 7: Prohibited Use */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            7. Prohibited Activities
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            You agree not to:
          </p>
          <ul className="list-disc pl-5 text-xs sm:text-sm text-muted-foreground space-y-1.5 leading-relaxed">
            <li>
              Reverse engineer, decompile, or disassemble any portion of the
              platform.
            </li>
            <li>
              Attempt to breach or bypass multi-tenant database isolation or
              security boundaries.
            </li>
            <li>
              Upload malicious code, corrupted documents, or unlawful content.
            </li>
            <li>
              Use the platform for spamming, automated scraping, or unlawful
              data collection.
            </li>
            <li>
              Misrepresent DentAssist AI as a licensed medical practitioner or
              substitute for emergency clinical care.
            </li>
          </ul>
        </section>

        {/* Section 8: Intellectual Property */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            8. Intellectual Property & Data Ownership
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Your Data:</strong> You retain
            full ownership of all clinic profiles, uploaded knowledge documents,
            and appointment records created in your tenant account. You grant
            DentAssist AI a limited license to host, process, and chunk this
            data solely to provide the services.
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">DentAssist AI Platform:</strong>{" "}
            All software, code, algorithms, user interfaces, branding, and
            documentation belong exclusively to {LEGAL_CONFIG.companyLegalName}.
          </p>
        </section>

        {/* Section 9: Disclaimer of Warranties */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            9. Disclaimer of Warranties
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, DENTASSIST AI IS
            PROVIDED ON AN “AS IS” AND “AS AVAILABLE” BASIS WITHOUT WARRANTIES
            OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING
            WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR
            NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
            UNINTERRUPTED, SECURE, OR ERROR-FREE.
          </p>
        </section>

        {/* Section 10: Limitation of Liability */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            10. Limitation of Liability
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL DENTASSIST
            AI, ITS DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT,
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING
            LOSS OF PROFITS, DATA, APPOINTMENT REVENUE, OR CLINICAL LIABILITIES
            ARISING OUT OF OR RELATING TO YOUR USE OF THE SERVICE.
          </p>
        </section>

        {/* Section 11: Governing Law & Review Note */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            11. Governing Law & Jurisdiction
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            These Terms shall be governed by and construed in accordance with
            the laws of {LEGAL_CONFIG.jurisdiction}, without regard to conflict
            of law principles. Any legal proceedings shall be brought in the
            courts of {LEGAL_CONFIG.jurisdiction}.
          </p>
          <p className="text-[11px] text-muted-foreground/80 italic">
            [Note for Practice Owner: Confirm your designated commercial
            jurisdiction and dispute resolution forum before publishing for
            public subscription.]
          </p>
        </section>
      </div>
    </PublicPageShell>
  );
}
