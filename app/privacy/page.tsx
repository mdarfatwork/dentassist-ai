import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { PublicPageShell } from "@/components/landing/public-page-shell";
import { LEGAL_CONFIG } from "@/lib/legal/legal-config";

export const metadata: Metadata = {
  title: "Privacy Policy — DentAssist AI",
  description:
    "DentAssist AI's privacy policy detailing data collection, AI processing, Google Calendar integration, third-party subprocessors, and security safeguards.",
  openGraph: {
    title: "DentAssist AI — Privacy Policy",
    description:
      "Transparent disclosure of how patient chat, clinic documents, and calendar scheduling data are processed and protected.",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <PublicPageShell>
      {/* Header Banner */}
      <div className="border-b border-border/70 bg-card/40 py-10 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary mb-2">
            Legal & Data Protection
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
            Effective Date: {LEGAL_CONFIG.effectiveDate} • Last Updated:{" "}
            {LEGAL_CONFIG.lastUpdatedDate}
          </p>
        </div>
      </div>

      {/* Main Document Body */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-12">
        {/* Practice Owner Review Notice */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 text-xs sm:text-sm text-stone-800 dark:text-stone-200 flex items-start gap-3">
          <ShieldAlert className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-foreground">
              Notice for Dental Practice Owners & Healthcare Administrators
            </span>
            <p className="text-muted-foreground leading-relaxed">
              This Privacy Policy accurately reflects the technical
              architecture, data handling, and subprocessors implemented in
              DentAssist AI. Because dental practices handle sensitive patient
              intake information, practice owners must review these provisions
              with their legal counsel to ensure alignment with applicable local
              healthcare privacy laws and practice-specific consent workflows
              before deployment.
            </p>
          </div>
        </div>

        {/* Section 1: Introduction and Scope */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            1. Introduction & Scope
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            This Privacy Policy describes how {LEGAL_CONFIG.companyLegalName}{" "}
            (“DentAssist AI”, “we”, “our”, or “us”) collects, uses, processes,
            stores, and protects information when dental clinics (“Practices”,
            “Subscribers”) and their authorized staff use the DentAssist AI
            platform, clinic management dashboard, and website chat widget.
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            DentAssist AI operates as a software service provider to dental
            practices. Practice owners configure the system, upload knowledge
            documents, connect Google Calendar, and embed the chatbot widget
            onto their clinic websites.
          </p>
        </section>

        {/* Section 2: Information Collected from Practice Users */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            2. Information Collected from Practice Owners & Account Users
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            When practice owners and clinic staff create an account, log in, or
            manage practice settings, we collect:
          </p>
          <ul className="list-disc pl-5 text-xs sm:text-sm text-muted-foreground space-y-1.5 leading-relaxed">
            <li>
              <strong className="text-foreground">Account Credentials:</strong>{" "}
              Full name, professional work email address, and cryptographically
              hashed password.
            </li>
            <li>
              <strong className="text-foreground">
                Practice Profile Details:
              </strong>{" "}
              Clinic legal name, tenant slug, physical address, clinic contact
              phone number, public email address, and clinic timezone.
            </li>
            <li>
              <strong className="text-foreground">Authentication Logs:</strong>{" "}
              Session tokens, IP addresses, browser user agent strings, and
              timestamps recorded by our authentication system (Better Auth) for
              account security.
            </li>
          </ul>
        </section>

        {/* Section 3: Clinic Configuration & Uploaded Documents */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            3. Clinic Configuration & Uploaded Knowledge Documents
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            To provide accurate patient chat responses, practice administrators
            upload informational files and configure clinical operating rules:
          </p>
          <ul className="list-disc pl-5 text-xs sm:text-sm text-muted-foreground space-y-1.5 leading-relaxed">
            <li>
              <strong className="text-foreground">Knowledge Documents:</strong>{" "}
              Practice policy documents, fee schedules, insurance guides,
              accepted payment details, and pre-appointment instructions
              uploaded in PDF, DOCX, or text format. These files are stored in
              private cloud object storage (AWS S3) and segmented into text
              chunks.
            </li>
            <li>
              <strong className="text-foreground">Semantic Embeddings:</strong>{" "}
              Text chunks are processed into mathematical vector embeddings and
              stored in our vector database (Pinecone) tagged with your clinic’s
              unique tenant identifier.
            </li>
            <li>
              <strong className="text-foreground">
                Operational Schedules:
              </strong>{" "}
              Weekly working hours, break windows, holiday closures, dentist
              rosters, and procedure chair durations configured in your practice
              dashboard.
            </li>
          </ul>
        </section>

        {/* Section 4: Patient Messages Submitted via AI Chat */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            4. Patient Inquiries Submitted Through the Website Chatbot
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            When website visitors interact with the DentAssist AI widget on a
            practice website:
          </p>
          <ul className="list-disc pl-5 text-xs sm:text-sm text-muted-foreground space-y-1.5 leading-relaxed">
            <li>
              <strong className="text-foreground">
                Conversation Messages:
              </strong>{" "}
              We record the text inquiries submitted by the visitor and the
              generated assistant replies to maintain multi-turn conversational
              context during the active session.
            </li>
            <li>
              <strong className="text-foreground">Widget Sessions:</strong>{" "}
              Transient widget session tokens identify ongoing visitor threads
              without requiring patient account creation.
            </li>
          </ul>
        </section>

        {/* Section 5: Appointment Information & Patient Data */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            5. Appointment Booking Information
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            When a patient requests an appointment through the chatbot,
            DentAssist AI collects essential scheduling details to complete the
            booking:
          </p>
          <ul className="list-disc pl-5 text-xs sm:text-sm text-muted-foreground space-y-1.5 leading-relaxed">
            <li>Patient full name.</li>
            <li>Patient contact email address.</li>
            <li>Patient contact telephone number.</li>
            <li>
              Selected dental procedure or service category and assigned
              dentist.
            </li>
            <li>Requested appointment date and start/end time.</li>
            <li>Voluntary patient notes or visit reasons.</li>
          </ul>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            These records are stored in the practice’s database table and linked
            to the clinic’s connected Google Calendar event.
          </p>
        </section>

        {/* Section 6: Google Calendar OAuth Integration */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            6. Google OAuth & Calendar Integration
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            DentAssist AI integrates with Google Calendar via Google OAuth2 with
            explicit practice administrator authorization:
          </p>
          <ul className="list-disc pl-5 text-xs sm:text-sm text-muted-foreground space-y-1.5 leading-relaxed">
            <li>
              <strong className="text-foreground">Scope of Access:</strong> We
              request calendar permissions strictly to read existing appointment
              busy blocks (preventing double bookings) and to insert newly
              booked patient appointments into your practice calendar.
            </li>
            <li>
              <strong className="text-foreground">Credential Security:</strong>{" "}
              OAuth access tokens and refresh tokens are encrypted at rest using
              AES-256 encryption (
              <code className="font-mono text-xs">
                GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY
              </code>
              ) before storage in the database.
            </li>
            <li>
              <strong className="text-foreground">No Advertising Use:</strong>{" "}
              Google Calendar data is never shared with external advertisers,
              data brokers, or used to train public foundation models.
            </li>
          </ul>
        </section>

        {/* Section 7: How Information Is Used */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            7. How Information Is Used
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            We use collected data solely to deliver, operate, and maintain the
            platform:
          </p>
          <ul className="list-disc pl-5 text-xs sm:text-sm text-muted-foreground space-y-1.5 leading-relaxed">
            <li>
              Retrieving practice knowledge chunks to provide grounded patient
              chat answers.
            </li>
            <li>
              Evaluating clinic opening hours and doctor availability against
              Google Calendar.
            </li>
            <li>Creating and managing confirmed appointment bookings.</li>
            <li>
              Authenticating practice users and securing clinic administration
              access.
            </li>
            <li>
              Sending transactional emails (account verification, password
              reset) via Resend.
            </li>
          </ul>
        </section>

        {/* Section 8: AI Processing & Third-Party Subprocessors */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            8. AI Processing & Third-Party Infrastructure Subprocessors
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            To generate conversational responses, patient inquiries and
            retrieved snippets from your clinic’s documents are transmitted to
            configured AI providers via encrypted API calls. Our actual
            configured subprocessors include:
          </p>

          <div className="rounded-xl border border-border/80 overflow-hidden text-xs">
            <div className="grid grid-cols-12 bg-muted/70 p-3 font-semibold text-foreground border-b border-border/60">
              <div className="col-span-4">Subprocessor</div>
              <div className="col-span-5">Purpose</div>
              <div className="col-span-3">Location</div>
            </div>
            {LEGAL_CONFIG.subprocessors.map((sub) => (
              <div
                key={sub.name}
                className="grid grid-cols-12 p-3 border-b border-border/40 last:border-0 text-muted-foreground"
              >
                <div className="col-span-4 font-medium text-foreground">
                  {sub.name}
                </div>
                <div className="col-span-5">{sub.purpose}</div>
                <div className="col-span-3">{sub.country}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 9: Data Security & Multi-Tenant Separation */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            9. Data Security & Multi-Tenant Isolation
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            We implement technical safeguards to protect practice data against
            unauthorized access:
          </p>
          <ul className="list-disc pl-5 text-xs sm:text-sm text-muted-foreground space-y-1.5 leading-relaxed">
            <li>
              <strong className="text-foreground">
                Multi-Tenant Database Isolation:
              </strong>{" "}
              All documents, appointments, services, and conversations are
              strictly segmented by practice organization ID in PostgreSQL.
            </li>
            <li>
              <strong className="text-foreground">
                Encryption in Transit & at Rest:
              </strong>{" "}
              Web traffic is encrypted with TLS/HTTPS. Stored OAuth tokens are
              encrypted with AES-256.
            </li>
            <li>
              <strong className="text-foreground">Access Controls:</strong>{" "}
              Authenticated sessions use HTTP-only, secure cookies with
              role-based authorization guards.
            </li>
          </ul>
        </section>

        {/* Section 10: Retention and Deletion */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            10. Data Retention & Deletion
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Practice data is retained for as long as the clinic maintains an
            active account on DentAssist AI. Practice administrators may delete
            uploaded knowledge documents through the dashboard at any time,
            which purges document chunks from the database and corresponding
            vectors from Pinecone. Account closure requests result in the
            deletion of practice records subject to legal retention obligations.
          </p>
        </section>

        {/* Section 11: Cookies & Tracking */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            11. Cookies & Tracking Technologies
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            DentAssist AI uses essential functional cookies strictly required
            for authentication and session management (
            <code className="font-mono text-xs">better-auth.session_token</code>
            ). We do not use third-party advertising cookies, trackers, or
            commercial data broker pixels on the website or within the
            dashboard.
          </p>
        </section>
      </div>
    </PublicPageShell>
  );
}
