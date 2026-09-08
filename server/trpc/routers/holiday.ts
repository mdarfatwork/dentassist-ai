import { router, organizationProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  createHolidaySchema,
  updateHolidaySchema,
  deleteHolidaySchema,
} from "@/lib/validations/holiday";

export const holidayRouter = router({
  /**
   * Retrieves all holidays belonging to the active organization.
   */
  list: organizationProcedure.query(async ({ ctx }) => {
    return await ctx.db.holiday.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { date: "asc" },
    });
  }),

  /**
   * Creates a new holiday scoped to the active organization.
   * Prevents duplicate holiday on the same date for the organization.
   */
  create: organizationProcedure
    .input(createHolidaySchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.holiday.findUnique({
        where: {
          organizationId_date: {
            organizationId: ctx.organizationId,
            date: input.date,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A closure or holiday is already scheduled for this date.",
        });
      }

      return await ctx.db.holiday.create({
        data: {
          organizationId: ctx.organizationId,
          name: input.name,
          date: input.date,
        },
      });
    }),

  /**
   * Updates an existing holiday, strictly enforcing tenant boundary.
   */
  update: organizationProcedure
    .input(updateHolidaySchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.holiday.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Holiday not found in this organization.",
        });
      }

      // Check for collision with another holiday on the new date
      const collision = await ctx.db.holiday.findFirst({
        where: {
          organizationId: ctx.organizationId,
          date: input.date,
          NOT: { id: input.id },
        },
      });

      if (collision) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Another holiday is already scheduled for this date.",
        });
      }

      return await ctx.db.holiday.update({
        where: { id: input.id },
        data: {
          name: input.name,
          date: input.date,
        },
      });
    }),

  /**
   * Deletes a holiday, strictly enforcing tenant boundary.
   */
  delete: organizationProcedure
    .input(deleteHolidaySchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.holiday.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Holiday not found in this organization.",
        });
      }

      await ctx.db.holiday.delete({
        where: { id: input.id },
      });

      return { success: true, id: input.id };
    }),
});
