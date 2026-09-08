import { z } from "zod";

export const createHolidaySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Holiday name must be at least 2 characters")
    .max(100, "Holiday name must be less than 100 characters"),
  date: z
    .union([
      z.iso.datetime(),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      z.date(),
    ])
    .transform((val) => {
      if (val instanceof Date) return val;
      // Normalise YYYY-MM-DD or ISO string to UTC midnight Date
      const datePart =
        typeof val === "string" && val.includes("T") ? val.split("T")[0] : val;
      return new Date(`${datePart}T00:00:00.000Z`);
    }),
});

export type CreateHolidayInput = z.infer<typeof createHolidaySchema>;

export const updateHolidaySchema = z.object({
  id: z.string().min(1, "Holiday ID is required"),
  name: z
    .string()
    .trim()
    .min(2, "Holiday name must be at least 2 characters")
    .max(100, "Holiday name must be less than 100 characters"),
  date: z
    .union([
      z.iso.datetime(),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      z.date(),
    ])
    .transform((val) => {
      if (val instanceof Date) return val;
      const datePart =
        typeof val === "string" && val.includes("T") ? val.split("T")[0] : val;
      return new Date(`${datePart}T00:00:00.000Z`);
    }),
});

export type UpdateHolidayInput = z.infer<typeof updateHolidaySchema>;

export const deleteHolidaySchema = z.object({
  id: z.string().min(1, "Holiday ID is required"),
});

export type DeleteHolidayInput = z.infer<typeof deleteHolidaySchema>;
