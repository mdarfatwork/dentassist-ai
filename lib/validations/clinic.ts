import { z } from "zod";

export const IANA_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "America/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Madrid",
  "Europe/Amsterdam",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Seoul",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
] as const;

export const updateClinicProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Clinic name must be at least 2 characters")
    .max(50, "Clinic name must be less than 50 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be less than 500 characters")
    .nullish()
    .transform((val) => val || null),
  logoUrl: z
    .string()
    .nullish()
    .transform((val) => val || null),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number is too long")
    .nullish()
    .refine(
      (val) => !val || /^(\+?[0-9\s\-()]{7,25})$/.test(val),
      "Please provide a valid phone number (7-25 digits, optional +)",
    )
    .transform((val) => val || null),
  email: z
    .string()
    .trim()
    .nullish()
    .refine(
      (val) => !val || z.email().safeParse(val).success,
      "Please provide a valid business email",
    )
    .transform((val) => val || null),
  address: z
    .string()
    .trim()
    .max(200, "Address must be less than 200 characters")
    .nullish()
    .transform((val) => val || null),
  timezone: z.string().trim().min(1, "Timezone is required").default("UTC"),
});

export type UpdateClinicProfileInput = z.infer<
  typeof updateClinicProfileSchema
>;
