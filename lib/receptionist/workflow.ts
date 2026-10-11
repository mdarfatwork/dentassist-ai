import { ClinicService } from "@/lib/clinic/service";
import { AppointmentService } from "@/lib/appointment/service";
import { RetrievalService } from "@/lib/knowledge/retrieval";
import {
  getAIProvider,
  sanitizePatientReply,
  type ChatMessageParam,
} from "@/lib/ai/provider";
import { resolveDateReference, resolveTimePreference } from "./date-resolver";
import {
  type BookingState,
  type ReceptionistToolCall,
  type SourceCitation,
  type ReceptionistIntentExtraction,
  ReceptionistIntentExtractionSchema,
} from "./types";
import { ReceptionistProfiler } from "./profiler";

export interface WorkflowInput {
  organizationId: string;
  conversationId: string;
  message: string;
  bookingState: BookingState;
  historyMessages: Array<{ role: string; content: string }>;
  profiler?: ReceptionistProfiler;
}

export interface WorkflowResult {
  reply: string;
  bookingState: BookingState;
  toolCalls: ReceptionistToolCall[];
  sources?: SourceCitation[];
}

/**
 * Deterministic fast-path regexes for common affirmative and negative responses
 */
const AFFIRMATION_REGEX =
  /^(yes|yeah|yep|yup|confirm|please\s+(?:confirm|book(?:\s+it)?)|book\s+it|sure|sounds?\s+good|proceed|go\s+ahead|perfect|okay|ok|correct|affirmative)[!.,\s]*$/i;

const NEGATION_REGEX =
  /^(no|nope|cancel|cancel\s+(?:that|it)|never\s*mind|don't\s+book|stop|not\s+(?:now|that|yet))[!.,\s]*$/i;

function isAffirmationPhrase(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return (
    AFFIRMATION_REGEX.test(lower) ||
    /^(yes|yeah|yep|yup|confirm|sure|ok|okay)\b/i.test(lower) ||
    lower.includes("confirm this booking") ||
    lower.includes("please confirm") ||
    lower.includes("please book") ||
    lower.includes("book it") ||
    lower.includes("sounds good") ||
    lower.includes("proceed") ||
    lower.includes("go ahead")
  );
}

function isNegationPhrase(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return (
    NEGATION_REGEX.test(lower) ||
    /^(no|nope|cancel)(?:[,.\s].*)?$/i.test(lower) ||
    lower.includes("cancel that") ||
    lower.includes("don't book") ||
    lower.includes("do not book") ||
    lower.includes("never mind")
  );
}

/**
 * Detects if the message is explicitly choosing one of the offered slots
 */
function matchOfferedSlot(
  message: string,
  slots?: Array<{ startTime: string; endTime: string; timeString: string }>,
): { startTime: string; endTime: string; timeString: string } | null {
  if (!slots || slots.length === 0) return null;
  const lower = message.toLowerCase().trim();

  // 1. Ordinal or indexed matching ("first", "1st", "second", "2nd", "slot 1", "number 1")
  if (
    /\b(first|1st|slot\s*1|number\s*1|the\s*first(?:\s*one)?)\b/i.test(lower)
  ) {
    return slots[0] || null;
  }
  if (
    /\b(second|2nd|slot\s*2|number\s*2|the\s*second(?:\s*one)?)\b/i.test(lower)
  ) {
    return slots[1] || null;
  }
  if (
    /\b(third|3rd|slot\s*3|number\s*3|the\s*third(?:\s*one)?)\b/i.test(lower)
  ) {
    return slots[2] || null;
  }
  if (/\b(fourth|4th|slot\s*4|number\s*4)\b/i.test(lower)) {
    return slots[3] || null;
  }
  if (/\b(last|the\s*last(?:\s*one)?)\b/i.test(lower)) {
    return slots[slots.length - 1] || null;
  }

  // 2. Direct time string match (e.g. "10:00", "10:00 AM", "10am", "10 am", "11:30", "9am", "9:00")
  for (const slot of slots) {
    const slotTimeLower = slot.timeString.toLowerCase(); // "10:00 am"
    const slotTimeClean = slotTimeLower.replace(/\s+/g, ""); // "10:00am"
    const slotWithoutAmPm = slotTimeClean.replace(/(am|pm)/, ""); // "10:00"
    const hourOnly = slotWithoutAmPm.split(":")[0]; // "10" or "09"
    const hourNum = parseInt(hourOnly, 10); // 10 or 9

    if (
      lower.includes(slotTimeLower) ||
      lower.includes(slotTimeClean) ||
      lower.includes(slotWithoutAmPm) ||
      new RegExp(`\\b(?:0?${hourNum})(?::00)?\\s*(?:am|pm)?\\b`, "i").test(
        lower,
      )
    ) {
      return slot;
    }
  }

  return null;
}

/**
 * Extracts patient contact details from unstructured message text via regex
 */
function extractContactDetails(text: string): {
  name?: string;
  email?: string;
  phone?: string;
} {
  const result: { name?: string; email?: string; phone?: string } = {};

  // Email regex
  const emailMatch = text.match(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  );
  if (emailMatch) {
    result.email = emailMatch[0];
  }

  // Phone regex: matches domestic & international numbers like +919876543210, +1 (555) 123-4567, 555-123-4567, 9876543210
  const phoneMatch = text.match(
    /(?:\+\d{1,4}[-.\s]*)?(?:\(?\d{2,4}\)?[-.\s]*)?\d{3,4}[-.\s]*\d{3,4}\b|\b\d{10}\b/,
  );
  if (phoneMatch) {
    result.phone = phoneMatch[0].trim();
  }

  // Name patterns: "full name is Alex Smith", "my name is Smith", "name is John Doe", "patient: John Doe", "I am Jane Doe"
  const namePatterns = [
    /(?:full\s+name\s+is|my\s+name\s+is|name\s+is|patient:?|i\s+am)\s+([A-Za-z]+(?:\s+[A-Za-z]+)*)/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})(?:,|\n|$)/,
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidateName = match[1].trim();
      if (!/^(?:email|phone|number|an|a|appointment)\b/i.test(candidateName)) {
        result.name = candidateName;
        break;
      }
    }
  }

  // Fallback: direct label match "name: Smith" or "Name is Smith"
  if (!result.name) {
    const directNameMatch = text.match(
      /\b(?:full\s+)?name\s*[:=]\s*([A-Za-z\s]+?)(?:,|$|\n|email|phone)/i,
    );
    if (directNameMatch && directNameMatch[1]) {
      result.name = directNameMatch[1].trim();
    }
  }

  return result;
}

/**
 * Deterministic Workflow Coordinator
 * Replaces the unconstrained agentic tool loop with a predictable, high-speed pipeline.
 */
export class ReceptionistWorkflowCoordinator {
  public static async execute(input: WorkflowInput): Promise<WorkflowResult> {
    const { organizationId, message, historyMessages, profiler } = input;
    const trimmedMessage = message.trim();
    const bookingState: BookingState = { ...input.bookingState };
    const toolCalls: ReceptionistToolCall[] = [];
    const sources: SourceCitation[] = [];

    // 1. Resolve clinic metadata (direct DB, cached or indexed)
    profiler?.startStage("Clinic Info Lookup");
    const clinic = await ClinicService.getClinicInfo(organizationId);
    const clinicName = clinic?.name || "the clinic";
    const clinicTimezone = clinic?.timezone || "UTC";
    profiler?.endStage("Clinic Info Lookup", { clinicName, clinicTimezone });

    // -------------------------------------------------------------------------
    // FAST-PATH 1: Awaiting Confirmation + Affirmation/Negation
    // -------------------------------------------------------------------------
    if (
      bookingState.status === "awaiting_confirmation" ||
      bookingState.confirmationPending
    ) {
      if (AFFIRMATION_REGEX.test(trimmedMessage)) {
        return await this.executeConfirmedBooking(
          organizationId,
          clinicName,
          clinicTimezone,
          bookingState,
          toolCalls,
          profiler,
        );
      }

      if (isNegationPhrase(trimmedMessage)) {
        bookingState.status = "collecting";
        bookingState.confirmationPending = false;
        return {
          reply: `Understood, I have cancelled the pending booking request. How else may I assist you with ${clinicName}?`,
          bookingState,
          toolCalls: [],
        };
      }
    }

    // -------------------------------------------------------------------------
    // FAST-PATH 2: Slot Selection from Offered Slots
    // -------------------------------------------------------------------------
    const matchedSlot = matchOfferedSlot(
      trimmedMessage,
      bookingState.lastOfferedSlots,
    );
    if (
      matchedSlot &&
      (bookingState.status === "awaiting_slot_selection" ||
        (bookingState.lastOfferedSlots &&
          bookingState.lastOfferedSlots.length > 0))
    ) {
      bookingState.selectedStartTime = matchedSlot.startTime;
      bookingState.selectedEndTime = matchedSlot.endTime;
      bookingState.selectedTimeDisplay = matchedSlot.timeString;

      // Also check if patient provided contact details in the same message
      const contact = extractContactDetails(trimmedMessage);
      if (contact.name) bookingState.patientName = contact.name;
      if (contact.email) bookingState.patientEmail = contact.email;
      if (contact.phone) bookingState.patientPhone = contact.phone;

      return this.handleSlotSelectionContinuation(
        clinicName,
        clinicTimezone,
        bookingState,
      );
    }

    // -------------------------------------------------------------------------
    // FAST-PATH 3: Patient Contact Details Intake (Deterministic Parsing)
    // When awaiting patient details and slot is already chosen, extract details deterministically
    // -------------------------------------------------------------------------
    if (
      bookingState.status === "awaiting_patient_details" &&
      bookingState.selectedStartTime
    ) {
      const contact = extractContactDetails(trimmedMessage);
      let updated = false;

      if (contact.name) {
        bookingState.patientName = contact.name;
        updated = true;
      }
      if (contact.email) {
        bookingState.patientEmail = contact.email;
        updated = true;
      }
      if (contact.phone) {
        bookingState.patientPhone = contact.phone;
        updated = true;
      }

      // If user provided a clean standalone name without prefixes (e.g. "Alex Smith" or "Jane Doe")
      if (!bookingState.patientName && !contact.email && !contact.phone) {
        const cleanName = trimmedMessage
          .replace(
            /^(?:my\s+name\s+is|full\s+name\s+is|name\s+is|i\s+am)\s+/i,
            "",
          )
          .trim();
        if (/^[A-Za-z]+(?:\s+[A-Za-z]+){1,3}$/.test(cleanName)) {
          bookingState.patientName = cleanName;
          updated = true;
        }
      }

      // If contact details are present or updated, advance deterministically to awaiting_confirmation
      if (
        updated ||
        (bookingState.patientName &&
          bookingState.patientEmail &&
          bookingState.patientPhone)
      ) {
        return this.handleSlotSelectionContinuation(
          clinicName,
          clinicTimezone,
          bookingState,
        );
      }
    }

    // -------------------------------------------------------------------------
    // FAST-PATH 4: Booking Confirmation / Rejection (Deterministic Dispatch)
    // When awaiting confirmation, resolve affirmative/negative inputs without LLM roundtrip
    // -------------------------------------------------------------------------
    if (bookingState.status === "awaiting_confirmation") {
      if (isNegationPhrase(trimmedMessage)) {
        bookingState.status = "cancelled";
        bookingState.isCancelled = true;
        return {
          reply: `No problem! I have cancelled this booking request. Please let me know whenever you'd like to explore alternative dates or services.`,
          bookingState,
          toolCalls: [],
        };
      }

      if (
        isAffirmationPhrase(trimmedMessage) &&
        bookingState.selectedStartTime &&
        bookingState.patientName &&
        bookingState.patientEmail &&
        bookingState.patientPhone
      ) {
        return await this.executeConfirmedBooking(
          organizationId,
          clinicName,
          clinicTimezone,
          bookingState,
          toolCalls,
          profiler,
        );
      }
    }

    // -------------------------------------------------------------------------
    // STAGE 3: Intent & Entity Extraction (Single structured LLM call)
    // -------------------------------------------------------------------------
    profiler?.startStage("Intent & Entity Extraction");
    const aiProvider = getAIProvider();

    const extractionSystemPrompt = `You are the intent and entity extraction parser for ${clinicName}, a dental practice operating in timezone ${clinicTimezone}.
Current Booking State: ${JSON.stringify(bookingState)}

Analyze the user's message and output a JSON object adhering to this schema:
{
  "intent": "GENERAL_GREETING" | "CLINIC_INFO" | "CLINIC_HOURS" | "SERVICE_CATALOG" | "KNOWLEDGE_INQUIRY" | "CHECK_AVAILABILITY" | "SELECT_SLOT" | "PROVIDE_PATIENT_DETAILS" | "CONFIRM_BOOKING" | "CANCEL_APPOINTMENT" | "RESCHEDULE_APPOINTMENT" | "GENERAL_QUESTION",
  "serviceName": string or null (e.g. "cleaning", "teeth whitening", "checkup", "filling", "root canal"),
  "dateReference": string or null (e.g. "tomorrow", "today", "next Monday", "2026-09-22"),
  "timePreference": { "type": "morning" | "afternoon" | "evening" | "exact", "value": string } or null,
  "dentistName": string or null,
  "selectedSlot": string or null,
  "patient": { "name": string, "email": string, "phone": string } or null,
  "appointmentReference": string or null,
  "isAffirmation": boolean or null,
  "isNegation": boolean or null,
  "unstructuredQuery": string or null
}

Rules:
1. For general services catalog inquiries ("What services do you offer?", "What treatments do you have?"), use SERVICE_CATALOG.
2. For specific treatment questions or booking requests ("I want cleaning", "Do you do whitening?", "Check slots for checkup"), extract the serviceName and use CHECK_AVAILABILITY if availability or booking is requested.
3. For unstructured clinic policy, insurance, payment, FAQ, or aftercare inquiries, use KNOWLEDGE_INQUIRY and fill unstructuredQuery.
4. For hours/schedules ("When are you open?", "What are your hours?"), use CLINIC_HOURS.
5. For address, phone, email, contact, use CLINIC_INFO.
6. Output ONLY raw JSON.`;

    const extractionMessages: ChatMessageParam[] = [
      { role: "system", content: extractionSystemPrompt },
      ...historyMessages.slice(-4).map((m) => ({
        role: m.role.toLowerCase() as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: trimmedMessage },
    ];

    let extraction: ReceptionistIntentExtraction | null = null;
    let extractionError: unknown = null;

    try {
      extraction =
        await aiProvider.generateStructured<ReceptionistIntentExtraction>({
          messages: extractionMessages,
          schema: ReceptionistIntentExtractionSchema,
          temperature: 0.0,
        });
    } catch (err: unknown) {
      extractionError = err;
      console.warn(
        "[ReceptionistWorkflow] Structured extraction failed across providers:",
        err,
      );
    }
    profiler?.endStage("Intent & Entity Extraction", {
      intent: extraction?.intent || (extractionError ? "AI_FAILED" : "UNKNOWN"),
      serviceName: extraction?.serviceName,
    });

    if (!extraction) {
      // If structured extraction failed, first check if deterministic service or info resolution can handle it
      const serviceMatch = await ClinicService.resolveServiceByName({
        organizationId,
        name: trimmedMessage,
      });

      if (serviceMatch.service) {
        bookingState.serviceId = serviceMatch.service.id;
        bookingState.serviceName = serviceMatch.service.name;
        extraction = {
          intent: "CHECK_AVAILABILITY",
          serviceName: serviceMatch.service.name,
          dateReference: trimmedMessage.toLowerCase().includes("tomorrow")
            ? "tomorrow"
            : undefined,
        };
      } else {
        const lowerMsg = trimmedMessage.toLowerCase();
        if (
          lowerMsg.includes("hour") ||
          lowerMsg.includes("open") ||
          lowerMsg.includes("close")
        ) {
          extraction = { intent: "CLINIC_HOURS" };
        } else if (
          lowerMsg.includes("where") ||
          lowerMsg.includes("address") ||
          lowerMsg.includes("location") ||
          lowerMsg.includes("phone")
        ) {
          extraction = { intent: "CLINIC_INFO" };
        } else {
          // Never silently fallback to GENERAL_QUESTION on provider failure!
          return {
            reply: `I'm temporarily unable to process that request. Please try again in a moment or reach our front desk directly at ${clinic?.phone || "our main number"}.`,
            bookingState,
            toolCalls: [],
          };
        }
      }
    }

    // -------------------------------------------------------------------------
    // STAGE 4: State Reconciliation & Deterministic Dispatch
    // -------------------------------------------------------------------------

    // Update patient contact info if extracted
    if (extraction.patient?.name)
      bookingState.patientName = extraction.patient.name;
    if (extraction.patient?.email)
      bookingState.patientEmail = extraction.patient.email;
    if (extraction.patient?.phone)
      bookingState.patientPhone = extraction.patient.phone;
    const regexContact = extractContactDetails(trimmedMessage);
    if (regexContact.name && !bookingState.patientName)
      bookingState.patientName = regexContact.name;
    if (regexContact.email && !bookingState.patientEmail)
      bookingState.patientEmail = regexContact.email;
    if (regexContact.phone && !bookingState.patientPhone)
      bookingState.patientPhone = regexContact.phone;

    // Service Resolution (DB + Aliases, strictly without RAG)
    if (extraction.serviceName) {
      profiler?.startStage("Service Resolution");
      const serviceMatch = await ClinicService.resolveServiceByName({
        organizationId,
        name: extraction.serviceName,
      });
      profiler?.endStage("Service Resolution", {
        matchType: serviceMatch.matchType,
        matchedService: serviceMatch.service?.name,
      });

      if (serviceMatch.service) {
        bookingState.serviceId = serviceMatch.service.id;
        bookingState.serviceName = serviceMatch.service.name;
      }
    }

    // Relative Date Resolution (Server-side with clinic timezone)
    if (extraction.dateReference) {
      profiler?.startStage("Date Resolution");
      const resolvedDate = resolveDateReference(
        extraction.dateReference,
        clinicTimezone,
      );
      bookingState.requestedDate = resolvedDate.dateStr;
      bookingState.dateDisplay = resolvedDate.displayDate;
      profiler?.endStage("Date Resolution", {
        resolvedDate: resolvedDate.dateStr,
        displayDate: resolvedDate.displayDate,
      });
    }

    if (extraction.timePreference) {
      bookingState.preferredTime =
        (extraction.timePreference.value || extraction.timePreference.type) ??
        undefined;
    }

    // Check affirmation for booking in progress
    if (
      extraction.isAffirmation &&
      bookingState.selectedStartTime &&
      bookingState.patientName &&
      bookingState.patientEmail &&
      bookingState.patientPhone
    ) {
      return await this.executeConfirmedBooking(
        organizationId,
        clinicName,
        clinicTimezone,
        bookingState,
        toolCalls,
        profiler,
      );
    }

    // If we are currently collecting patient details and slot is already selected:
    if (
      bookingState.selectedStartTime &&
      (bookingState.status === "awaiting_patient_details" ||
        extraction.intent === "PROVIDE_PATIENT_DETAILS")
    ) {
      return this.handleSlotSelectionContinuation(
        clinicName,
        clinicTimezone,
        bookingState,
      );
    }

    // Dispatch based on categorized intent
    switch (extraction.intent) {
      case "GENERAL_GREETING": {
        return {
          reply: `Hello! Welcome to ${clinicName}. I'm your AI dental receptionist. How can I help you today? You can ask about our dental services, clinic hours, treatment pricing, or check appointment availability.`,
          bookingState,
          toolCalls: [],
        };
      }

      case "CLINIC_INFO": {
        profiler?.startStage("Tool [getClinicInfo]");
        const info = await ClinicService.getClinicInfo(organizationId);
        profiler?.endStage("Tool [getClinicInfo]");

        toolCalls.push({
          id: `call_${Date.now()}`,
          name: "getClinicInfo",
          args: {},
          result: info,
          executionTimeMs: 10,
        });

        const reply = `**${info?.name || clinicName}**\n- **Address**: ${info?.address || "Please contact our front desk for directions."}\n- **Phone**: ${info?.phone || "Not specified"}\n- **Email**: ${info?.email || "Not specified"}\n- **Timezone**: ${info?.timezone || clinicTimezone}\n\nPlease let me know if you would like to schedule an appointment or have questions about our treatments.`;
        return { reply, bookingState, toolCalls };
      }

      case "CLINIC_HOURS": {
        profiler?.startStage("Tool [getClinicHours]");
        const hours = await ClinicService.getClinicHours(organizationId);
        profiler?.endStage("Tool [getClinicHours]");

        toolCalls.push({
          id: `call_${Date.now()}`,
          name: "getClinicHours",
          args: {},
          result: hours,
          executionTimeMs: 10,
        });

        const scheduleLines = hours.weeklySchedule
          .map(
            (s) =>
              `- **${s.day.charAt(0) + s.day.slice(1).toLowerCase()}**: ${s.isOpen ? s.hours : "Closed"}`,
          )
          .join("\n");

        let holidayNote = "";
        if (hours.upcomingHolidays.length > 0) {
          holidayNote = `\n\n**Upcoming Holiday Closures**:\n${hours.upcomingHolidays
            .map((h) => `- ${h.name}: ${h.date}`)
            .join("\n")}`;
        }

        const reply = `Here are the operating hours for **${clinicName}** (${hours.timezone}):\n\n${scheduleLines}${holidayNote}\n\nWould you like to book an appointment during our open hours?`;
        return { reply, bookingState, toolCalls };
      }

      case "SERVICE_CATALOG": {
        profiler?.startStage("Tool [listServices]");
        const services = await ClinicService.listServices(organizationId);
        profiler?.endStage("Tool [listServices]");

        toolCalls.push({
          id: `call_${Date.now()}`,
          name: "listServices",
          args: {},
          result: services,
          executionTimeMs: 10,
        });

        if (services.length === 0) {
          return {
            reply: `We are currently updating our active dental services catalog for ${clinicName}. Please call our front desk for details.`,
            bookingState,
            toolCalls,
          };
        }

        const serviceList = services
          .map(
            (s) =>
              `- **${s.name}** (${s.durationMinutes} mins)${s.description ? ` — ${s.description}` : ""}`,
          )
          .join("\n");

        const reply = `Here are the dental services offered at **${clinicName}**:\n\n${serviceList}\n\nWhich procedure would you like to schedule or learn more about?`;
        return { reply, bookingState, toolCalls };
      }

      case "KNOWLEDGE_INQUIRY": {
        const queryToSearch =
          extraction.unstructuredQuery ||
          extraction.serviceName ||
          trimmedMessage;
        profiler?.startStage("Tool [searchKnowledge]");
        const chunks = await RetrievalService.search({
          organizationId,
          query: queryToSearch,
          topK: 3,
        });
        profiler?.endStage("Tool [searchKnowledge]", {
          chunksFound: chunks.length,
        });

        for (const c of chunks) {
          sources.push({
            documentId: c.documentId,
            documentName: c.documentName,
            headingPath: c.headingPath,
            pageNumber: c.pageNumber,
          });
        }

        toolCalls.push({
          id: `call_${Date.now()}`,
          name: "searchKnowledge",
          args: { query: queryToSearch },
          result: chunks.map((c) => ({
            document: c.documentName,
            heading: c.headingPath,
            content: c.content,
          })),
          executionTimeMs: 50,
        });

        if (chunks.length === 0) {
          return {
            reply: `I don't have specific documentation in the clinic records regarding that policy or question. However, our clinical staff will be happy to assist you when you visit or call us. How else may I assist you?`,
            bookingState,
            toolCalls,
            sources,
          };
        }

        profiler?.startStage("Response Generation");
        const contextText = chunks
          .map((c) => `[Document: ${c.documentName}]\n${c.content}`)
          .join("\n\n");

        const genPrompt: ChatMessageParam[] = [
          {
            role: "system",
            content: `You are the professional receptionist for ${clinicName}. Based strictly on the verified excerpts below, answer the patient's inquiry accurately, professionally, and concisely in Markdown. Do not invent medical advice or unlisted policies.\n\nVerified Clinic Excerpts:\n${contextText}`,
          },
          { role: "user", content: trimmedMessage },
        ];

        let generatedReply = "";
        try {
          generatedReply = await aiProvider.generateText({
            messages: genPrompt,
            temperature: 0.2,
          });
        } catch (err: unknown) {
          console.warn(
            "[ReceptionistWorkflow] Knowledge response generation failed across providers:",
            err,
          );
          return {
            reply: `I'm temporarily unable to process that request. Please try again in a moment or reach our front desk directly at ${clinic?.phone || "our main number"}.`,
            bookingState,
            toolCalls,
            sources,
          };
        }
        profiler?.endStage("Response Generation");

        return {
          reply: sanitizePatientReply(generatedReply),
          bookingState,
          toolCalls,
          sources,
        };
      }

      case "CHECK_AVAILABILITY": {
        return await this.handleCheckAvailability(
          organizationId,
          clinicName,
          clinicTimezone,
          bookingState,
          extraction,
          toolCalls,
          profiler,
        );
      }

      case "SELECT_SLOT": {
        if (
          bookingState.lastOfferedSlots &&
          bookingState.lastOfferedSlots.length > 0
        ) {
          const slot = matchOfferedSlot(
            extraction.selectedSlot || trimmedMessage,
            bookingState.lastOfferedSlots,
          );
          if (slot) {
            bookingState.selectedStartTime = slot.startTime;
            bookingState.selectedEndTime = slot.endTime;
            bookingState.selectedTimeDisplay = slot.timeString;
            return this.handleSlotSelectionContinuation(
              clinicName,
              clinicTimezone,
              bookingState,
            );
          }
        }
        return await this.handleCheckAvailability(
          organizationId,
          clinicName,
          clinicTimezone,
          bookingState,
          extraction,
          toolCalls,
          profiler,
        );
      }

      case "PROVIDE_PATIENT_DETAILS": {
        return this.handleSlotSelectionContinuation(
          clinicName,
          clinicTimezone,
          bookingState,
        );
      }

      case "CONFIRM_BOOKING": {
        // Requirement 24: AI must NOT book without entering explicit confirmation state
        if (bookingState.status !== "awaiting_confirmation") {
          return this.handleSlotSelectionContinuation(
            clinicName,
            clinicTimezone,
            bookingState,
          );
        }
        return await this.executeConfirmedBooking(
          organizationId,
          clinicName,
          clinicTimezone,
          bookingState,
          toolCalls,
          profiler,
        );
      }

      case "CANCEL_APPOINTMENT": {
        return await this.handleCancelAppointment(
          organizationId,
          clinicName,
          extraction,
          toolCalls,
          profiler,
        );
      }

      case "RESCHEDULE_APPOINTMENT": {
        return await this.handleRescheduleAppointment(
          organizationId,
          clinicName,
          extraction,
          toolCalls,
        );
      }

      case "GENERAL_QUESTION":
      default: {
        // First, check if user is asking about a known service or booking
        if (bookingState.serviceName && !bookingState.requestedDate) {
          return {
            reply: `I have noted that you are interested in **${bookingState.serviceName}**. Which day would you prefer for your appointment (for example, tomorrow, Friday, or next Monday)?`,
            bookingState,
            toolCalls,
          };
        }

        // Single generation call answering politely as the clinic receptionist
        profiler?.startStage("Response Generation");
        const answerPrompt: ChatMessageParam[] = [
          {
            role: "system",
            content: `You are DentAssist AI, the professional, reassuring, and concise receptionist for ${clinicName} (${clinicTimezone}).
Operating guidelines:
- If the patient is asking for an appointment or dental treatment, warmly ask which service they need (e.g. checkup, cleaning, whitening, filling) and what day they prefer.
- NEVER invent services, dentist names, fees, or availability.
- Calm, professional tone. No slang or excessive emojis.`,
          },
          ...historyMessages.slice(-4).map((m) => ({
            role: m.role.toLowerCase() as "user" | "assistant",
            content: m.content,
          })),
          { role: "user", content: trimmedMessage },
        ];

        let genericReply = "";
        try {
          genericReply = await aiProvider.generateText({
            messages: answerPrompt,
            temperature: 0.2,
          });
        } catch (err: unknown) {
          console.warn(
            "[ReceptionistWorkflow] General response generation failed across providers:",
            err,
          );
          return {
            reply: `I'm temporarily unable to process that request. Please try again in a moment or reach our front desk directly at ${clinic?.phone || "our main number"}.`,
            bookingState,
            toolCalls,
          };
        }
        profiler?.endStage("Response Generation");

        return {
          reply: sanitizePatientReply(genericReply),
          bookingState,
          toolCalls,
        };
      }
    }
  }

  /**
   * Availability check sub-workflow with mandatory input validation
   */
  private static async handleCheckAvailability(
    organizationId: string,
    clinicName: string,
    clinicTimezone: string,
    bookingState: BookingState,
    extraction: ReceptionistIntentExtraction,
    toolCalls: ReceptionistToolCall[],
    profiler?: ReceptionistProfiler,
  ): Promise<WorkflowResult> {
    // If no service is resolved yet
    if (!bookingState.serviceId) {
      bookingState.status = "collecting";
      const services = await ClinicService.listServices(organizationId);
      const serviceOptions =
        services.length > 0
          ? ` (We offer ${services
              .slice(0, 4)
              .map((s) => s.name)
              .join(", ")})`
          : "";
      return {
        reply: `I'd be glad to check available appointment times! Which dental service or treatment are you looking to book?${serviceOptions}`,
        bookingState,
        toolCalls,
      };
    }

    // If no date is specified yet, default to tomorrow
    if (!bookingState.requestedDate) {
      const tomorrowResolved = resolveDateReference("tomorrow", clinicTimezone);
      bookingState.requestedDate = tomorrowResolved.dateStr;
      bookingState.dateDisplay = tomorrowResolved.displayDate;
    }

    // Resolve time range preference (morning, afternoon, evening)
    const timePrefRange = resolveTimePreference({
      type: extraction.timePreference?.type ?? undefined,
      value: extraction.timePreference?.value ?? undefined,
    });

    profiler?.startStage("Tool [checkAvailability]");
    const availability = await AppointmentService.checkAvailability({
      organizationId,
      serviceId: bookingState.serviceId,
      dentistId: bookingState.dentistId,
      date: bookingState.requestedDate,
      preferredTimeRange: timePrefRange,
    });
    profiler?.endStage("Tool [checkAvailability]", {
      isAvailable: availability.isAvailable,
      slotsCount: availability.availableSlots.length,
    });

    toolCalls.push({
      id: `call_${Date.now()}`,
      name: "checkAvailability",
      args: {
        serviceId: bookingState.serviceId,
        date: bookingState.requestedDate,
        preferredTimeRange: timePrefRange,
      },
      result: availability,
      executionTimeMs: 40,
    });

    if (!availability.isAvailable || availability.availableSlots.length === 0) {
      const reasonMsg =
        availability.message ||
        `There are no open slots for **${bookingState.serviceName}** on ${bookingState.dateDisplay || bookingState.requestedDate}.`;
      return {
        reply: `${reasonMsg}\n\nWould you like me to check the following business day, or would another day work better for you?`,
        bookingState,
        toolCalls,
      };
    }

    // Store candidate slots in state
    bookingState.lastOfferedSlots = availability.availableSlots
      .slice(0, 5)
      .map((s) => ({
        startTime: s.startTime,
        endTime: s.endTime,
        timeString: s.timeString,
      }));
    bookingState.status = "awaiting_slot_selection";

    const slotBullets = bookingState.lastOfferedSlots
      .map((s, idx) => `${idx + 1}. **${s.timeString}**`)
      .join("\n");

    const reply = `I found the following open appointments for **${bookingState.serviceName}** on **${bookingState.dateDisplay || bookingState.requestedDate}** (${availability.timezone}):\n\n${slotBullets}\n\nWhich time slot would you prefer?`;
    return { reply, bookingState, toolCalls };
  }

  /**
   * Handles slot selection progression: checks if required patient details are present
   * before asking for explicit confirmation.
   */
  private static handleSlotSelectionContinuation(
    clinicName: string,
    clinicTimezone: string,
    bookingState: BookingState,
  ): WorkflowResult {
    const missing: string[] = [];
    if (!bookingState.patientName) missing.push("Full Name");
    if (!bookingState.patientEmail) missing.push("Email Address");
    if (!bookingState.patientPhone) missing.push("Phone Number");

    if (missing.length > 0) {
      bookingState.status = "awaiting_patient_details";
      const missingList = missing.map((m, i) => `${i + 1}. ${m}`).join("\n");
      return {
        reply: `Great! I've selected the **${bookingState.selectedTimeDisplay}** slot for your **${bookingState.serviceName}** on **${bookingState.dateDisplay || bookingState.requestedDate}**.\n\nTo reserve this appointment, please provide the following details:\n${missingList}`,
        bookingState,
        toolCalls: [],
      };
    }

    // All details present -> advance to explicit confirmation
    bookingState.status = "awaiting_confirmation";
    bookingState.confirmationPending = true;

    const summary = `Please review and confirm your appointment details:\n\n- **Clinic**: ${clinicName}\n- **Service**: ${bookingState.serviceName}\n- **Date & Time**: ${bookingState.dateDisplay || bookingState.requestedDate} at **${bookingState.selectedTimeDisplay}** (${clinicTimezone})\n- **Patient Name**: ${bookingState.patientName}\n- **Email**: ${bookingState.patientEmail}\n- **Phone**: ${bookingState.patientPhone}\n\n**Would you like me to book and confirm this appointment?** (Reply "Yes, book it" to confirm)`;

    return {
      reply: summary,
      bookingState,
      toolCalls: [],
    };
  }

  /**
   * Final transactional booking with atomic availability check and conflict resolution
   */
  private static async executeConfirmedBooking(
    organizationId: string,
    clinicName: string,
    clinicTimezone: string,
    bookingState: BookingState,
    toolCalls: ReceptionistToolCall[],
    profiler?: ReceptionistProfiler,
  ): Promise<WorkflowResult> {
    if (
      !bookingState.serviceId ||
      !bookingState.selectedStartTime ||
      !bookingState.patientName ||
      !bookingState.patientEmail ||
      !bookingState.patientPhone
    ) {
      return this.handleSlotSelectionContinuation(
        clinicName,
        clinicTimezone,
        bookingState,
      );
    }

    profiler?.startStage("Final Availability Check & Booking");
    try {
      const booking = await AppointmentService.bookAppointment({
        organizationId,
        serviceId: bookingState.serviceId,
        dentistId: bookingState.dentistId,
        startTime: bookingState.selectedStartTime,
        patientName: bookingState.patientName,
        patientEmail: bookingState.patientEmail,
        patientPhone: bookingState.patientPhone,
      });

      profiler?.endStage("Final Availability Check & Booking", {
        reference: booking.reference,
        success: true,
      });

      toolCalls.push({
        id: `call_${Date.now()}`,
        name: "bookAppointment",
        args: {
          serviceId: bookingState.serviceId,
          startTime: bookingState.selectedStartTime,
          patientName: bookingState.patientName,
          patientEmail: bookingState.patientEmail,
          patientPhone: bookingState.patientPhone,
        },
        result: booking,
        executionTimeMs: 120,
      });

      bookingState.status = "completed";
      bookingState.confirmationPending = false;
      bookingState.isConfirmed = true;
      bookingState.appointmentReference = booking.reference;

      const confirmationReply = `🎉 **Your appointment has been confirmed!**\n\n- **Reference**: \`${booking.reference}\`\n- **Service**: ${booking.serviceName}\n- **Date & Time**: ${booking.startTimeFormatted} (${booking.timezone})\n- **Dentist**: ${booking.dentistName}\n- **Patient**: ${booking.patientName}\n\nA calendar confirmation and notification have been sent to **${bookingState.patientEmail}**. Please let us know if you need to make any changes!`;

      return {
        reply: confirmationReply,
        bookingState,
        toolCalls,
      };
    } catch (err: unknown) {
      profiler?.endStage("Final Availability Check & Booking", {
        success: false,
        error: String(err),
      });

      const errorMsg = err instanceof Error ? err.message : String(err);

      // Handle slot conflict (already taken concurrently)
      if (
        errorMsg.includes("already booked") ||
        errorMsg.includes("conflict") ||
        errorMsg.includes("just booked")
      ) {
        bookingState.status = "awaiting_slot_selection";
        bookingState.confirmationPending = false;
        bookingState.selectedStartTime = undefined;
        bookingState.selectedEndTime = undefined;

        // Fetch new available slots
        const recheck = await AppointmentService.checkAvailability({
          organizationId,
          serviceId: bookingState.serviceId,
          date:
            bookingState.requestedDate ||
            new Date().toISOString().split("T")[0],
        });

        const newSlotsBullets = recheck.availableSlots
          .slice(0, 4)
          .map((s, idx) => `${idx + 1}. **${s.timeString}**`)
          .join("\n");

        return {
          reply: `⚠️ I apologize, but the **${bookingState.selectedTimeDisplay}** slot was just booked by another patient.\n\nHere are the remaining open times for that date:\n${newSlotsBullets}\n\nWhich of these alternative times would you like to reserve?`,
          bookingState,
          toolCalls,
        };
      }

      return {
        reply: `We could not complete your booking at this moment: ${errorMsg}. Please try another time or contact the front desk.`,
        bookingState,
        toolCalls,
      };
    }
  }

  /**
   * Cancellation handler
   */
  private static async handleCancelAppointment(
    organizationId: string,
    clinicName: string,
    extraction: ReceptionistIntentExtraction,
    toolCalls: ReceptionistToolCall[],
    profiler?: ReceptionistProfiler,
  ): Promise<WorkflowResult> {
    const reference = extraction.appointmentReference;
    if (!reference) {
      return {
        reply: `To cancel an appointment at ${clinicName}, please provide your appointment reference code (for example, \`DA-7K29F\`) and the email address used during booking.`,
        bookingState: {},
        toolCalls: [],
      };
    }

    profiler?.startStage("Tool [cancelAppointment]");
    try {
      const result = await AppointmentService.cancelAppointment({
        organizationId,
        reference,
        patientEmail: extraction.patient?.email ?? undefined,
        patientPhone: extraction.patient?.phone ?? undefined,
      });
      profiler?.endStage("Tool [cancelAppointment]", {
        success: result.success,
      });

      toolCalls.push({
        id: `call_${Date.now()}`,
        name: "cancelAppointment",
        args: { reference },
        result,
        executionTimeMs: 40,
      });

      return {
        reply: `Your appointment with reference \`${reference}\` has been successfully cancelled. Please let us know if you would like to reschedule for a future date.`,
        bookingState: { isCancelled: true, appointmentReference: reference },
        toolCalls,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        reply: `Could not cancel appointment \`${reference}\`: ${msg}. Please ensure your reference code and contact details match our records.`,
        bookingState: {},
        toolCalls,
      };
    }
  }

  /**
   * Rescheduling handler
   */
  private static async handleRescheduleAppointment(
    organizationId: string,
    clinicName: string,
    extraction: ReceptionistIntentExtraction,
    toolCalls: ReceptionistToolCall[],
  ): Promise<WorkflowResult> {
    const reference = extraction.appointmentReference;
    if (!reference) {
      return {
        reply: `To reschedule an existing appointment at ${clinicName}, please provide your appointment reference code (e.g. \`DA-7K29F\`) along with your preferred new date and time.`,
        bookingState: {},
        toolCalls: [],
      };
    }

    return {
      reply: `I have found your appointment request for \`${reference}\`. What date and time would you like to reschedule it to?`,
      bookingState: { appointmentReference: reference },
      toolCalls,
    };
  }
}
