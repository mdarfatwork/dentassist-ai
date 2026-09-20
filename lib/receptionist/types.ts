export interface BookingState {
  serviceId?: string;
  serviceName?: string;
  dentistId?: string;
  dentistName?: string;
  requestedDate?: string;
  preferredTime?: string;
  selectedStartTime?: string;
  selectedEndTime?: string;
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
  appointmentReference?: string;
  confirmationPending?: boolean;
  isConfirmed?: boolean;
  isCancelled?: boolean;
  isRescheduled?: boolean;
}

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

export interface ReceptionistResponse {
  reply: string;
  bookingState: BookingState;
  toolCalls: ReceptionistToolCall[];
  sources?: SourceCitation[];
  isSecurityFlagged?: boolean;
  securityNotice?: string;
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
    }
  | { type: "error"; error: string };
