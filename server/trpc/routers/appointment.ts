import { router, organizationProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { SchedulingService } from "@/lib/calendar/scheduling-service";
import { CalendarDomainError } from "@/lib/calendar/types";
import { db } from "@/lib/db";

export const appointmentRouter = router({
  /**
   * Retrieves appointments for the active organization with multi-field filtering
   */
  list: organizationProcedure
    .input(
      z
        .object({
          date: z.string().optional(), // YYYY-MM-DD
          dentistId: z.string().optional(),
          status: z
            .enum(["CONFIRMED", "SCHEDULED", "COMPLETED", "CANCELLED"])
            .optional(),
          source: z.enum(["AI_CHAT", "AI_VOICE", "MANUAL"]).optional(),
          limit: z.number().min(1).max(200).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const prisma = ctx.db.appointment ? ctx.db : db;

      let dateFilter = {};
      if (input?.date) {
        const startOfDay = new Date(`${input.date}T00:00:00.000Z`);
        const endOfDay = new Date(`${input.date}T23:59:59.999Z`);
        dateFilter = {
          startTime: {
            gte: startOfDay,
            lte: endOfDay,
          },
        };
      }

      const appointments = await prisma.appointment.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(input?.status ? { status: input.status } : {}),
          ...(input?.dentistId ? { dentistId: input.dentistId } : {}),
          ...(input?.source ? { source: input.source } : {}),
          ...dateFilter,
        },
        include: {
          service: {
            select: {
              id: true,
              name: true,
              durationMinutes: true,
            },
          },
          dentist: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { startTime: "asc" },
        take: input?.limit ?? 50,
      });

      return appointments;
    }),

  /**
   * Retrieves a single appointment by reference code or ID
   */
  get: organizationProcedure
    .input(
      z.object({
        reference: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const prisma = ctx.db.appointment ? ctx.db : db;
      const appointment = await prisma.appointment.findFirst({
        where: {
          reference: input.reference.toUpperCase().trim(),
          organizationId: ctx.organizationId,
        },
        include: {
          service: true,
          dentist: true,
        },
      });

      if (!appointment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Appointment not found in this organization.",
        });
      }

      return appointment;
    }),

  /**
   * Creates an appointment manually from the clinic dashboard
   * Uses the same SchedulingService to guarantee identical validation & double-booking prevention.
   */
  createManual: organizationProcedure
    .input(
      z.object({
        serviceId: z.string().min(1, "serviceId is required"),
        dentistId: z.string().optional(),
        startTime: z.string().min(1, "startTime is required"),
        patientName: z.string().min(1, "patientName is required"),
        patientEmail: z.string().email("Valid patientEmail is required"),
        patientPhone: z.string().min(6, "Valid patientPhone is required"),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await SchedulingService.bookAppointment({
          organizationId: ctx.organizationId,
          serviceId: input.serviceId,
          dentistId: input.dentistId,
          startTime: input.startTime,
          patientName: input.patientName,
          patientEmail: input.patientEmail,
          patientPhone: input.patientPhone,
          notes: input.notes,
          source: "MANUAL",
        });
      } catch (err: unknown) {
        if (err instanceof CalendarDomainError) {
          if (err.code === "APPOINTMENT_CONFLICT") {
            throw new TRPCError({
              code: "CONFLICT",
              message: err.message,
            });
          }
          if (
            err.code === "SERVICE_NOT_FOUND" ||
            err.code === "DENTIST_NOT_FOUND"
          ) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: err.message,
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            err instanceof Error
              ? err.message
              : "Failed to create manual appointment.",
        });
      }
    }),

  /**
   * Cancels an appointment directly from staff dashboard operations
   */
  cancel: organizationProcedure
    .input(
      z.object({
        reference: z.string().min(1),
        patientEmail: z.string().optional(),
        patientPhone: z.string().optional(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const prisma = ctx.db.appointment ? ctx.db : db;
      const appt = await prisma.appointment.findFirst({
        where: {
          reference: input.reference.toUpperCase().trim(),
          organizationId: ctx.organizationId,
        },
      });

      if (!appt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Appointment not found.",
        });
      }

      const emailToVerify = input.patientEmail || appt.patientEmail;
      try {
        return await SchedulingService.cancelAppointment({
          organizationId: ctx.organizationId,
          reference: input.reference,
          patientEmail: emailToVerify,
          patientPhone: input.patientPhone,
          reason: input.reason,
        });
      } catch (err: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            err instanceof Error
              ? err.message
              : "Failed to cancel appointment.",
        });
      }
    }),

  /**
   * Reschedules an appointment to a new validated slot
   */
  reschedule: organizationProcedure
    .input(
      z.object({
        reference: z.string().min(1),
        newStartTime: z.string().min(1),
        newDentistId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await SchedulingService.rescheduleAppointment({
          organizationId: ctx.organizationId,
          reference: input.reference,
          newStartTime: input.newStartTime,
          newDentistId: input.newDentistId,
        });
      } catch (err: unknown) {
        if (err instanceof CalendarDomainError) {
          if (err.code === "APPOINTMENT_CONFLICT") {
            throw new TRPCError({
              code: "CONFLICT",
              message: err.message,
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            err instanceof Error
              ? err.message
              : "Failed to reschedule appointment.",
        });
      }
    }),

  /**
   * Marks an appointment as COMPLETED
   */
  markCompleted: organizationProcedure
    .input(
      z.object({
        reference: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const prisma = ctx.db.appointment ? ctx.db : db;
      const appt = await prisma.appointment.findFirst({
        where: {
          reference: input.reference.toUpperCase().trim(),
          organizationId: ctx.organizationId,
        },
      });

      if (!appt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Appointment not found.",
        });
      }

      const updated = await prisma.appointment.update({
        where: { id: appt.id },
        data: { status: "COMPLETED" },
      });

      return {
        success: true,
        reference: updated.reference,
        status: updated.status,
      };
    }),
});
