import { FAQAccordion, type FAQItem } from "./faq-accordion";

const FAQ_ITEMS: FAQItem[] = [
  {
    id: "what-is-dentassist",
    question: "What is DentAssist AI?",
    answer:
      "DentAssist AI is an AI receptionist built specifically for dental practices. It operates on your clinic's website to answer routine patient questions and assist with appointment scheduling using your clinic's configured rules and connected Google Calendar.",
  },
  {
    id: "how-grounded",
    question: "How does the AI answer clinic-specific questions?",
    answer:
      "You upload your practice documents, such as fee guides, insurance policies, office hours, and pre-appointment prep notes, to your clinic's Knowledge Base. The AI receptionist retrieves answers strictly from your approved documents, avoiding unverified guesses.",
  },
  {
    id: "patient-scheduling",
    question: "Can patients schedule appointments?",
    answer:
      "Yes. The chatbot checks your configured clinic operating hours, doctor assignments, and Google Calendar availability in real time, then assists the patient with requesting and confirming an appointment slot.",
  },
  {
    id: "google-calendar",
    question: "Does it work with Google Calendar?",
    answer:
      "Yes. DentAssist AI connects directly to your clinic's Google Calendar via secure Google OAuth. It checks your existing calendar events to prevent double bookings and creates confirmed appointments directly on your calendar.",
  },
  {
    id: "clinic-config",
    question: "Can I configure my clinic's services and operating hours?",
    answer:
      "Yes. Through the practice dashboard, you can add your dentists and hygienists, specify each dental service and its chair duration, set weekly opening hours, and add planned holiday closures.",
  },
  {
    id: "add-to-website",
    question: "How do I add the chatbot to my website?",
    answer:
      "After setting up your practice in the dashboard, you receive a single embeddable JavaScript snippet. Adding this script to your website activates the DentAssist AI chat widget for your visitors.",
  },
  {
    id: "get-started",
    question: "How do I get started?",
    answer:
      "Click 'Create Your Practice Account', complete the signup form with your practice details, connect your Google Calendar, and upload your clinic's informational documents.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="py-16 sm:py-24 bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Clear Answers
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Everything dental practice owners and clinic administrators need to
            know about DentAssist AI.
          </p>
        </div>

        <FAQAccordion items={FAQ_ITEMS} />
      </div>
    </section>
  );
}
