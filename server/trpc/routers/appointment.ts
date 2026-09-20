import { router, organizationProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { AppointmentService } from "@/lib/appointment/service";
import { db } from "@/lib/db";

export const appointmentRouter = router({
  /**
   * Retrieves all appointments for the active organization.
   */
  list: organizationProcedure
    .input(
      z
        .object({
          status: z.enum(["CONFIRMED", "CANCELLED"]).optional(),
          limit: z.number().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const prisma = ctx.db.appointment ? ctx.db : db;
      const appointments = await prisma.appointment.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(input?.status ? { status: input.status } : {}),
        },
        include: {
          service: {
            select: {
              name: true,
              durationMinutes: true,
            },
          },
          dentist: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { startTime: "desc" },
        take: input?.limit ?? 50,
      });

      return appointments;
    }),

  /**
   * Retrieves a single appointment by reference code or ID.
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
   * Cancels an appointment directly from staff dashboard operations.
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
      return await AppointmentService.cancelAppointment({
        organizationId: ctx.organizationId,
        reference: input.reference,
        patientEmail: emailToVerify,
        patientPhone: input.patientPhone,
        reason: input.reason,
      });
    }),
});
