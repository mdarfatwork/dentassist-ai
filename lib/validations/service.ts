import { z } from "zod";

export const createServiceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Service name must be at least 2 characters")
    .max(100, "Service name must be less than 100 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be less than 500 characters")
    .nullish()
    .transform((val) => val || null),
  durationMinutes: z
    .number({
      error: "Duration must be a valid number of minutes",
    })
    .int("Duration must be an integer number of minutes")
    .min(5, "Service duration must be at least 5 minutes")
    .max(480, "Service duration cannot exceed 480 minutes (8 hours)"),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = z.object({
  id: z.string().min(1, "Service ID is required"),
  name: z
    .string()
    .trim()
    .min(2, "Service name must be at least 2 characters")
    .max(100, "Service name must be less than 100 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be less than 500 characters")
    .nullish()
    .transform((val) => val || null),
  durationMinutes: z
    .number({
      error: "Duration must be a valid number of minutes",
    })
    .int("Duration must be an integer number of minutes")
    .min(5, "Service duration must be at least 5 minutes")
    .max(480, "Service duration cannot exceed 480 minutes (8 hours)"),
});

export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

export const deleteServiceSchema = z.object({
  id: z.string().min(1, "Service ID is required"),
});

export type DeleteServiceInput = z.infer<typeof deleteServiceSchema>;
