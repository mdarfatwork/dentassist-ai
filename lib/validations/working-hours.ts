import { z } from "zod";

export const DAYS_OF_WEEK = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export type DayOfWeekValue = (typeof DAYS_OF_WEEK)[number];

export const dayOfWeekSchema = z.enum(DAYS_OF_WEEK);

export const dayScheduleSchema = z
  .object({
    dayOfWeek: dayOfWeekSchema,
    isOpen: z.boolean(),
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Start time must be in HH:mm format")
      .nullish()
      .transform((val) => val || null),
    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "End time must be in HH:mm format")
      .nullish()
      .transform((val) => val || null),
  })
  .refine(
    (data) => {
      if (!data.isOpen) return true;
      if (!data.startTime || !data.endTime) return false;
      return data.startTime < data.endTime;
    },
    {
      message: "Opening time must be earlier than closing time",
      path: ["endTime"],
    },
  );

export type DayScheduleInput = z.infer<typeof dayScheduleSchema>;

export const updateWorkingHoursSchema = z.object({
  schedules: z
    .array(dayScheduleSchema)
    .min(1, "At least one day schedule is required")
    .max(7, "Cannot exceed 7 day schedules")
    .refine(
      (schedules) => {
        const days = schedules.map((s) => s.dayOfWeek);
        return new Set(days).size === days.length;
      },
      {
        message: "Duplicate days of week are not allowed",
      },
    ),
});

export type UpdateWorkingHoursInput = z.infer<typeof updateWorkingHoursSchema>;

export const DEFAULT_WORKING_HOURS: DayScheduleInput[] = [
  { dayOfWeek: "MONDAY", isOpen: true, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: "TUESDAY", isOpen: true, startTime: "09:00", endTime: "17:00" },
  {
    dayOfWeek: "WEDNESDAY",
    isOpen: true,
    startTime: "09:00",
    endTime: "17:00",
  },
  { dayOfWeek: "THURSDAY", isOpen: true, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: "FRIDAY", isOpen: true, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: "SATURDAY", isOpen: true, startTime: "10:00", endTime: "14:00" },
  { dayOfWeek: "SUNDAY", isOpen: false, startTime: null, endTime: null },
];
