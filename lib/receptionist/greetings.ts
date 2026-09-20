/**
 * Greeting Fast-Path Helper for AI Receptionist
 * Handles standard courtesy greetings instantly (<5ms) without invoking
 * heavy external LLMs, Prompt Guard classifiers, or tool loops.
 */

const GREETING_REGEX =
  /^(hi|hello|hey|good\s+(morning|afternoon|evening|day)|greetings|howdy|namaste|morning|afternoon|evening)(\s+(there|dentassist|clinic|assistant|receptionist|team))?[!.,?~:;—\s\p{Emoji}]*$/iu;

// If message contains any of these actionable intent tokens, it is not a pure greeting
const ACTIONABLE_INTENT_WORDS = [
  "book",
  "appointment",
  "schedule",
  "reschedule",
  "cancel",
  "cost",
  "price",
  "pricing",
  "fee",
  "open",
  "close",
  "hours",
  "time",
  "pain",
  "hurt",
  "bleed",
  "broken",
  "tooth",
  "teeth",
  "dentist",
  "doctor",
  "cleaning",
  "whitening",
  "extraction",
  "implant",
  "filling",
  "root canal",
  "insurance",
  "emergency",
  "available",
  "availability",
  "service",
  "treat",
];

/**
 * Determines whether a given user message is a pure greeting / pleasantry
 * that should receive an instantaneous greeting response.
 */
export function isPureGreeting(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return false;

  // Quick length check - pure greetings are concise
  if (trimmed.split(/\s+/).length > 6) {
    return false;
  }

  const lower = trimmed.toLowerCase();

  // Check if message contains actionable dental or booking keywords
  for (const word of ACTIONABLE_INTENT_WORDS) {
    // Word boundary check
    const regex = new RegExp(`\\b${word}\\b`, "i");
    if (regex.test(lower)) {
      return false;
    }
  }

  return GREETING_REGEX.test(trimmed);
}

/**
 * Builds a friendly, professional, clinic-branded greeting message.
 */
export function getClinicGreetingResponse(clinicName: string): string {
  const name = clinicName?.trim() || "the clinic";
  return `Hello! Welcome to ${name}. I'm your AI dental receptionist. How can I help you today? You can ask about our dental services, clinic hours, treatment pricing, or I can help you schedule an appointment.`;
}
