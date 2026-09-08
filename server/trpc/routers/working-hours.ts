import { router, organizationProcedure } from "../trpc";
import {
  updateWorkingHoursSchema,
  DEFAULT_WORKING_HOURS,
  DAYS_OF_WEEK,
  type DayScheduleInput,
} from "@/lib/validations/working-hours";

export const workingHoursRouter = router({
  /**
   * Retrieves the 7-day weekly schedule for the active organization.
   * If not yet configured in DB, returns seeded default business hours.
   */
  get: organizationProcedure.query(
    async ({ ctx }): Promise<DayScheduleInput[]> => {
      const existingHours = await ctx.db.workingHours.findMany({
        where: { organizationId: ctx.organizationId },
      });

      const hoursMap = new Map(
        existingHours.map((h) => [
          h.dayOfWeek,
          {
            dayOfWeek: h.dayOfWeek,
            isOpen: h.isOpen,
            startTime: h.startTime,
            endTime: h.endTime,
          },
        ]),
      );

      // Ensure all 7 days of the week are present in order
      return DAYS_OF_WEEK.map((day) => {
        if (hoursMap.has(day)) {
          return hoursMap.get(day)!;
        }
        const defaultDay = DEFAULT_WORKING_HOURS.find(
          (d) => d.dayOfWeek === day,
        );
        return (
          defaultDay || {
            dayOfWeek: day,
            isOpen: false,
            startTime: null,
            endTime: null,
          }
        );
      });
    },
  ),

  /**
   * Updates or creates the weekly working hours transactionally.
   */
  update: organizationProcedure
    .input(updateWorkingHoursSchema)
    .mutation(async ({ ctx, input }) => {
      const results = await ctx.db.$transaction(async (tx) => {
        const upsertedList = [];
        for (const schedule of input.schedules) {
          const upserted = await tx.workingHours.upsert({
            where: {
              organizationId_dayOfWeek: {
                organizationId: ctx.organizationId,
                dayOfWeek: schedule.dayOfWeek,
              },
            },
            update: {
              isOpen: schedule.isOpen,
              startTime: schedule.isOpen ? schedule.startTime : null,
              endTime: schedule.isOpen ? schedule.endTime : null,
            },
            create: {
              organizationId: ctx.organizationId,
              dayOfWeek: schedule.dayOfWeek,
              isOpen: schedule.isOpen,
              startTime: schedule.isOpen ? schedule.startTime : null,
              endTime: schedule.isOpen ? schedule.endTime : null,
            },
          });
          upsertedList.push(upserted);
        }
        return upsertedList;
      });

      return {
        success: true,
        schedules: results.map((r) => ({
          dayOfWeek: r.dayOfWeek,
          isOpen: r.isOpen,
          startTime: r.startTime,
          endTime: r.endTime,
        })),
      };
    }),
});
