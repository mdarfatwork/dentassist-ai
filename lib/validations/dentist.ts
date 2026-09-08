import { z } from "zod";

export const createDentistSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Dentist name must be at least 2 characters")
    .max(100, "Dentist name must be less than 100 characters"),
  specialization: z
    .string()
    .trim()
    .max(100, "Specialization must be less than 100 characters")
    .nullish()
    .transform((val) => val || null),
});

export type CreateDentistInput = z.infer<typeof createDentistSchema>;

export const updateDentistSchema = z.object({
  id: z.string().min(1, "Dentist ID is required"),
  name: z
    .string()
    .trim()
    .min(2, "Dentist name must be at least 2 characters")
    .max(100, "Dentist name must be less than 100 characters"),
  specialization: z
    .string()
    .trim()
    .max(100, "Specialization must be less than 100 characters")
    .nullish()
    .transform((val) => val || null),
});

export type UpdateDentistInput = z.infer<typeof updateDentistSchema>;

export const deleteDentistSchema = z.object({
  id: z.string().min(1, "Dentist ID is required"),
});

export type DeleteDentistInput = z.infer<typeof deleteDentistSchema>;
