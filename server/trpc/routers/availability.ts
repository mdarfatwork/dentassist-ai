import { router, organizationProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { SchedulingService } from "@/lib/calendar/scheduling-service";
import { CalendarDomainError } from "@/lib/calendar/types";

export const availabilityRouter = router({
  /**
   * Unified checkAvailability procedure used by staff dashboard & scheduling
   */
  check: organizationProcedure
    .input(
      z.object({
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
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        return await SchedulingService.checkAvailability({
          organizationId: ctx.organizationId,
          serviceId: input.serviceId,
          dentistId: input.dentistId,
          date: input.date,
          preferredTimeRange: input.preferredTimeRange,
        });
      } catch (err: unknown) {
        if (err instanceof CalendarDomainError) {
          if (
            err.code === "SERVICE_NOT_FOUND" ||
            err.code === "DENTIST_NOT_FOUND"
          ) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: err.message,
            });
          }
          if (err.code === "CALENDAR_AVAILABILITY_UNAVAILABLE") {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: err.message,
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            err instanceof Error
              ? err.message
              : "Failed to check appointment availability.",
        });
      }
    }),
});
