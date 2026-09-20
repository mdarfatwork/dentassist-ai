import { z } from "zod";
import { RetrievalService } from "@/lib/knowledge/retrieval";
import { ClinicService } from "@/lib/clinic/service";
import { AppointmentService } from "@/lib/appointment/service";
import { type SourceCitation } from "./types";

export const searchKnowledgeSchema = z.object({
  query: z.string().min(1, "Search query is required"),
});

export const getClinicInfoSchema = z.object({});

export const getClinicHoursSchema = z.object({});

export const listServicesSchema = z.object({});

export const checkAvailabilitySchema = z.object({
  serviceId: z.string().min(1, "serviceId is required"),
  dentistId: z.string().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format"),
  preferredTimeRange: z
    .object({
      start: z.string().optional(),
      end: z.string().optional(),
    })
    .optional(),
});

export const bookAppointmentSchema = z.object({
  serviceId: z.string().min(1, "serviceId is required"),
  dentistId: z.string().optional(),
  startTime: z.string().min(1, "startTime (ISO string) is required"),
  patientName: z.string().min(1, "patientName is required"),
  patientEmail: z.email("Valid patientEmail is required"),
  patientPhone: z.string().min(6, "Valid patientPhone is required"),
  notes: z.string().optional(),
});

export const cancelAppointmentSchema = z.object({
  reference: z.string().min(1, "Appointment reference is required"),
  patientEmail: z.email().optional(),
  patientPhone: z.string().optional(),
  reason: z.string().optional(),
});

export const rescheduleAppointmentSchema = z.object({
  reference: z.string().min(1, "Appointment reference is required"),
  patientEmail: z.email().optional(),
  patientPhone: z.string().optional(),
  newStartTime: z.string().min(1, "newStartTime (ISO string) is required"),
  newDentistId: z.string().optional(),
});

/**
 * Tool definitions exposed to NVIDIA LLM
 */
export const RECEPTIONIST_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "searchKnowledge",
      description:
        "Searches clinic-specific documents, policies, FAQs, pricing guidelines, insurance coverage, and post-op care instructions from the official knowledge base.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "The specific question or topic to search within the clinic knowledge base.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getClinicInfo",
      description:
        "Retrieves clinic name, address, phone number, email, and timezone. Use this instead of knowledge search for basic clinic contact details.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getClinicHours",
      description:
        "Retrieves official weekly operating hours, closed days, and upcoming holiday closures in the clinic's configured timezone.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "listServices",
      description:
        "Lists all dental services currently offered by the clinic along with duration in minutes and descriptions.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "checkAvailability",
      description:
        "Checks real-time appointment availability for a specific service and date (YYYY-MM-DD), returning open time slots formatted in the clinic timezone.",
      parameters: {
        type: "object",
        properties: {
          serviceId: {
            type: "string",
            description:
              "The exact serviceId returned from listServices(). Never guess or fabricate this ID.",
          },
          dentistId: {
            type: "string",
            description:
              "Optional dentist ID if the patient requested a specific practitioner.",
          },
          date: {
            type: "string",
            description:
              "Target appointment date in YYYY-MM-DD format (e.g. 2026-09-22).",
          },
          preferredTimeRange: {
            type: "object",
            properties: {
              start: {
                type: "string",
                description:
                  "Start of preferred window in HH:mm format (e.g. 10:00)",
              },
              end: {
                type: "string",
                description:
                  "End of preferred window in HH:mm format (e.g. 14:00)",
              },
            },
          },
        },
        required: ["serviceId", "date"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "bookAppointment",
      description:
        "High-impact action: Confirms and books an appointment. MUST ONLY be called AFTER the patient has explicitly confirmed the date, time, service, and contact information.",
      parameters: {
        type: "object",
        properties: {
          serviceId: {
            type: "string",
            description: "Valid service ID for the booking.",
          },
          dentistId: {
            type: "string",
            description: "Optional dentist ID if specified.",
          },
          startTime: {
            type: "string",
            description:
              "The exact ISO startTime chosen from checkAvailability() (e.g. 2026-09-22T10:00:00.000Z).",
          },
          patientName: {
            type: "string",
            description: "Full name of the patient.",
          },
          patientEmail: {
            type: "string",
            description: "Email address of the patient.",
          },
          patientPhone: {
            type: "string",
            description: "Phone number of the patient.",
          },
          notes: {
            type: "string",
            description:
              "Optional appointment notes or symptoms provided by the patient.",
          },
        },
        required: [
          "serviceId",
          "startTime",
          "patientName",
          "patientEmail",
          "patientPhone",
        ],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "cancelAppointment",
      description:
        "High-impact action: Cancels an existing appointment. Requires reference and patient email/phone verification.",
      parameters: {
        type: "object",
        properties: {
          reference: {
            type: "string",
            description: "Appointment reference code (e.g. DA-7K29F).",
          },
          patientEmail: {
            type: "string",
            description: "Email address of the patient to verify ownership.",
          },
          patientPhone: {
            type: "string",
            description: "Phone number of the patient to verify ownership.",
          },
          reason: {
            type: "string",
            description: "Optional reason for cancellation.",
          },
        },
        required: ["reference"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "rescheduleAppointment",
      description:
        "High-impact action: Moves an existing confirmed appointment to a new available time slot. Requires reference and patient verification.",
      parameters: {
        type: "object",
        properties: {
          reference: {
            type: "string",
            description: "Appointment reference code (e.g. DA-7K29F).",
          },
          patientEmail: {
            type: "string",
            description: "Email address of the patient to verify ownership.",
          },
          patientPhone: {
            type: "string",
            description: "Phone number of the patient to verify ownership.",
          },
          newStartTime: {
            type: "string",
            description:
              "The new ISO startTime chosen from checkAvailability().",
          },
          newDentistId: {
            type: "string",
            description: "Optional new dentist ID if changing practitioner.",
          },
        },
        required: ["reference", "newStartTime"],
      },
    },
  },
];

export interface ToolExecutionContext {
  organizationId: string;
}

export interface ToolExecutionResponse {
  result: unknown;
  sources?: SourceCitation[];
}

/**
 * Executes a tool call with strict server-side validation and multi-tenant isolation.
 */
export async function executeReceptionistTool(
  toolName: string,
  rawArgs: Record<string, unknown>,
  context: ToolExecutionContext,
): Promise<ToolExecutionResponse> {
  const toolStartTime = performance.now();
  const { organizationId } = context;
  const argsSummary =
    typeof rawArgs === "object" && rawArgs !== null
      ? JSON.stringify(rawArgs).slice(0, 80)
      : String(rawArgs);

  console.log(
    `[ReceptionistTool] 🔧 Executing tool "${toolName}" with args: ${argsSummary}`,
  );

  try {
    let response: ToolExecutionResponse;

    switch (toolName) {
      case "searchKnowledge": {
        const parsed = searchKnowledgeSchema.parse(rawArgs);
        const chunks = await RetrievalService.search({
          organizationId,
          query: parsed.query,
          topK: 5,
        });

        const sources: SourceCitation[] = [];
        const seen = new Set<string>();

        for (const chunk of chunks) {
          const key = `${chunk.documentId}:${chunk.headingPath || ""}:${chunk.pageNumber || ""}`;
          if (!seen.has(key)) {
            seen.add(key);
            sources.push({
              documentId: chunk.documentId,
              documentName: chunk.documentName,
              headingPath: chunk.headingPath,
              pageNumber: chunk.pageNumber,
            });
          }
        }

        if (chunks.length === 0) {
          response = {
            result: {
              found: false,
              message:
                "No specific clinic knowledge document matches this inquiry.",
            },
            sources: [],
          };
        } else {
          response = {
            result: {
              found: true,
              excerpts: chunks.map((c) => ({
                document: c.documentName,
                heading: c.headingPath,
                page: c.pageNumber,
                content: c.content,
              })),
            },
            sources,
          };
        }
        break;
      }

      case "getClinicInfo": {
        getClinicInfoSchema.parse(rawArgs);
        const info = await ClinicService.getClinicInfo(organizationId);
        response = { result: info };
        break;
      }

      case "getClinicHours": {
        getClinicHoursSchema.parse(rawArgs);
        const hours = await ClinicService.getClinicHours(organizationId);
        response = { result: hours };
        break;
      }

      case "listServices": {
        listServicesSchema.parse(rawArgs);
        const services = await ClinicService.listServices(organizationId);
        response = { result: services };
        break;
      }

      case "checkAvailability": {
        const parsed = checkAvailabilitySchema.parse(rawArgs);
        const availability = await AppointmentService.checkAvailability({
          organizationId,
          serviceId: parsed.serviceId,
          dentistId: parsed.dentistId,
          date: parsed.date,
          preferredTimeRange: parsed.preferredTimeRange,
        });
        response = { result: availability };
        break;
      }

      case "bookAppointment": {
        const parsed = bookAppointmentSchema.parse(rawArgs);
        const booking = await AppointmentService.bookAppointment({
          organizationId,
          serviceId: parsed.serviceId,
          dentistId: parsed.dentistId,
          startTime: parsed.startTime,
          patientName: parsed.patientName,
          patientEmail: parsed.patientEmail,
          patientPhone: parsed.patientPhone,
          notes: parsed.notes,
        });
        response = { result: booking };
        break;
      }

      case "cancelAppointment": {
        const parsed = cancelAppointmentSchema.parse(rawArgs);
        const cancellation = await AppointmentService.cancelAppointment({
          organizationId,
          reference: parsed.reference,
          patientEmail: parsed.patientEmail,
          patientPhone: parsed.patientPhone,
          reason: parsed.reason,
        });
        response = { result: cancellation };
        break;
      }

      case "rescheduleAppointment": {
        const parsed = rescheduleAppointmentSchema.parse(rawArgs);
        const reschedule = await AppointmentService.rescheduleAppointment({
          organizationId,
          reference: parsed.reference,
          patientEmail: parsed.patientEmail,
          patientPhone: parsed.patientPhone,
          newStartTime: parsed.newStartTime,
          newDentistId: parsed.newDentistId,
        });
        response = { result: reschedule };
        break;
      }

      default:
        throw new Error(`Unknown tool requested: "${toolName}".`);
    }

    const duration = (performance.now() - toolStartTime).toFixed(1);
    console.log(
      `[ReceptionistTool] ✅ Tool "${toolName}" completed in ${duration}ms`,
    );
    return response;
  } catch (err) {
    const duration = (performance.now() - toolStartTime).toFixed(1);
    console.warn(
      `[ReceptionistTool] ❌ Tool "${toolName}" failed after ${duration}ms:`,
      err,
    );
    throw err;
  }
}
