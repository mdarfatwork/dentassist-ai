import { z } from "zod";

export type BookingWorkflowStatus =
  | "idle"
  | "collecting"
  | "checking_availability"
  | "awaiting_slot_selection"
  | "awaiting_patient_details"
  | "awaiting_confirmation"
  | "booking"
  | "completed"
  | "cancelled";

export interface BookingState {
  status?: BookingWorkflowStatus;
  serviceId?: string;
  serviceName?: string;
  dentistId?: string;
  dentistName?: string;
  requestedDate?: string; // YYYY-MM-DD
  dateDisplay?: string; // e.g. "Tuesday, September 22, 2026"
  preferredTime?: string;
  selectedStartTime?: string;
  selectedEndTime?: string;
  selectedTimeDisplay?: string; // e.g. "10:00 AM"
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
  appointmentReference?: string;
  confirmationPending?: boolean;
  isConfirmed?: boolean;
  isCancelled?: boolean;
  isRescheduled?: boolean;
  lastOfferedSlots?: Array<{
    startTime: string;
    endTime: string;
    timeString: string;
  }>;
}

export const RECEPTIONIST_INTENTS = [
  "GENERAL_GREETING",
  "CLINIC_INFO",
  "CLINIC_HOURS",
  "SERVICE_CATALOG",
  "KNOWLEDGE_INQUIRY",
  "CHECK_AVAILABILITY",
  "SELECT_SLOT",
  "PROVIDE_PATIENT_DETAILS",
  "CONFIRM_BOOKING",
  "CANCEL_APPOINTMENT",
  "RESCHEDULE_APPOINTMENT",
  "GENERAL_QUESTION",
] as const;

export type ReceptionistIntentType = (typeof RECEPTIONIST_INTENTS)[number];

export const ReceptionistIntentExtractionSchema = z.object({
  intent: z
    .enum(RECEPTIONIST_INTENTS)
    .describe(
      "The primary patient intent categorized into one of the verified operational categories.",
    ),
  serviceName: z
    .string()
    .nullish()
    .describe(
      "Mentioned dental procedure or treatment (e.g. cleaning, whitening, filling, root canal).",
    ),
  dateReference: z
    .string()
    .nullish()
    .describe(
      "Extracted relative or explicit date phrase (e.g. tomorrow, today, Monday, next Friday).",
    ),
  timePreference: z
    .object({
      type: z.enum(["morning", "afternoon", "evening", "exact"]).nullish(),
      value: z
        .string()
        .nullish()
        .describe("Specific time mentioned, e.g. 10am, 2:30pm"),
    })
    .nullish()
    .describe("Patient's time of day preference"),
  dentistName: z
    .string()
    .nullish()
    .describe("Specific dentist requested by name if any"),
  selectedSlot: z
    .string()
    .nullish()
    .describe(
      "Slot selection choice (e.g. '10:00 AM', '10:00', 'first slot', 'slot 2')",
    ),
  patient: z
    .object({
      name: z.string().nullish(),
      email: z.string().nullish(),
      phone: z.string().nullish(),
    })
    .nullish()
    .describe("Contact details provided by patient in this message"),
  appointmentReference: z
    .string()
    .nullish()
    .describe(
      "Appointment reference code for cancel or reschedule (e.g. DA-7K29F)",
    ),
  isAffirmation: z
    .boolean()
    .nullish()
    .describe(
      "True if user is confirming or affirming (e.g. 'yes', 'confirm', 'please book it', 'sounds good')",
    ),
  isNegation: z
    .boolean()
    .nullish()
    .describe(
      "True if user is denying or rejecting (e.g. 'no', 'cancel that', 'never mind')",
    ),
  unstructuredQuery: z
    .string()
    .nullish()
    .describe(
      "Search query for knowledge inquiry about clinic policies, insurance, aftercare, or FAQs",
    ),
});

export type ReceptionistIntentExtraction = z.infer<
  typeof ReceptionistIntentExtractionSchema
>;

export interface ReceptionistToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
  executionTimeMs?: number;
}

export interface ReceptionistMessage {
  id: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  toolName?: string;
  toolCallId?: string;
  createdAt: Date;
}

export interface SourceCitation {
  documentId: string;
  documentName: string;
  headingPath: string | null;
  pageNumber: number | null;
}

export interface ReceptionistTelemetry {
  totalLatencyMs: number;
  promptGuardLatencyMs: number;
  conversationLatencyMs: number;
  userMessageSaveLatencyMs: number;
  clinicInfoLatencyMs: number;
  intentExtractionLatencyMs: number;
  serviceResolutionLatencyMs: number;
  availabilityLatencyMs: number;
  bookingLatencyMs: number;
  ragLatencyMs: number;
  responseGenerationLatencyMs: number;
  assistantSaveLatencyMs: number;
  llmCalls: number;
  toolCalls: number;
  ragCalls: number;
  promptGuardCalls: number;
  dbCalls: number;
  provider: string;
  model: string;
  latencies: Record<string, number>;
}
import { type AITrace } from "./trace";

export interface ReceptionistResponse {
  conversationId?: string;
  reply: string;
  bookingState: BookingState;
  toolCalls: ReceptionistToolCall[];
  sources?: SourceCitation[];
  isSecurityFlagged?: boolean;
  securityNotice?: string;
  telemetry?: ReceptionistTelemetry;
  traceId?: string;
  turnId?: string;
  trace?: AITrace;
}

export type ReceptionistStreamEvent =
  | {
      type: "stage";
      stage: import("@/components/workspace/ai-activity").AIStage;
    }
  | { type: "tool_start"; toolName: string; toolCallId: string }
  | {
      type: "tool_end";
      toolName: string;
      executionTimeMs: number;
      result: unknown;
    }
  | { type: "token"; delta: string }
  | {
      type: "done";
      reply: string;
      bookingState: BookingState;
      sources?: SourceCitation[];
      toolCalls: ReceptionistToolCall[];
      conversationId: string;
      isSecurityFlagged?: boolean;
      securityNotice?: string;
      telemetry?: ReceptionistTelemetry;
      traceId?: string;
      turnId?: string;
      trace?: AITrace;
    }
  | { type: "error"; error: string };
