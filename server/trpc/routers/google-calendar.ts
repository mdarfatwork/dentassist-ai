import { router, organizationProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { GoogleCalendarService } from "@/lib/calendar/google-calendar-service";
import { CalendarDomainError } from "@/lib/calendar/types";

export const googleCalendarRouter = router({
  /**
   * Retrieves connection status for the current clinic
   */
  getStatus: organizationProcedure.query(async ({ ctx }) => {
    try {
      return await GoogleCalendarService.getConnectionStatus(
        ctx.organizationId,
      );
    } catch (err: unknown) {
      console.error("[TRPC googleCalendar.getStatus] Error:", err);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          err instanceof Error
            ? err.message
            : "Failed to retrieve Google Calendar connection status.",
      });
    }
  }),

  /**
   * Lists all Google Calendars for the connected account
   */
  listCalendars: organizationProcedure.query(async ({ ctx }) => {
    try {
      return await GoogleCalendarService.listCalendars(ctx.organizationId);
    } catch (err: unknown) {
      if (err instanceof CalendarDomainError) {
        if (err.code === "GOOGLE_CALENDAR_NOT_CONNECTED") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: err.message,
          });
        }
        if (err.code === "GOOGLE_CALENDAR_REAUTH_REQUIRED") {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: err.message,
          });
        }
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          err instanceof Error
            ? err.message
            : "Failed to list Google Calendars.",
      });
    }
  }),

  /**
   * Selects which calendar DentAssist AI will use for availability & bookings
   */
  selectCalendar: organizationProcedure
    .input(
      z.object({
        calendarId: z.string().min(1, "Calendar ID is required"),
        calendarName: z.string().min(1, "Calendar Name is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Must be OWNER or ADMIN to change calendar settings
      if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only clinic owners or administrators can select calendars.",
        });
      }

      try {
        return await GoogleCalendarService.selectCalendar({
          organizationId: ctx.organizationId,
          calendarId: input.calendarId,
          calendarName: input.calendarName,
        });
      } catch (err: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            err instanceof Error
              ? err.message
              : "Failed to select Google Calendar.",
        });
      }
    }),

  /**
   * Disconnects the clinic Google Calendar
   */
  disconnect: organizationProcedure.mutation(async ({ ctx }) => {
    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "Only clinic owners or administrators can disconnect Google Calendar.",
      });
    }

    try {
      return await GoogleCalendarService.disconnect(ctx.organizationId);
    } catch (err: unknown) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          err instanceof Error
            ? err.message
            : "Failed to disconnect Google Calendar.",
      });
    }
  }),
});
