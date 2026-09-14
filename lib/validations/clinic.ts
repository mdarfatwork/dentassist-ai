import { z } from "zod";

export const IANA_TIMEZONES: readonly string[] = (() => {
  try {
    if (
      typeof Intl !== "undefined" &&
      typeof Intl.supportedValuesOf === "function"
    ) {
      const supported = Intl.supportedValuesOf("timeZone");
      if (supported && supported.length > 0) {
        return Array.from(new Set(["UTC", ...supported]));
      }
    }
  } catch {
    // Fallback if Intl.supportedValuesOf is unavailable
  }
  return [
    "UTC",
    "Africa/Cairo",
    "Africa/Casablanca",
    "Africa/Johannesburg",
    "Africa/Lagos",
    "Africa/Nairobi",
    "America/Anchorage",
    "America/Argentina/Buenos_Aires",
    "America/Bogota",
    "America/Chicago",
    "America/Denver",
    "America/Edmonton",
    "America/Halifax",
    "America/Honolulu",
    "America/Los_Angeles",
    "America/Mexico_City",
    "America/New_York",
    "America/Phoenix",
    "America/Santiago",
    "America/Sao_Paulo",
    "America/Toronto",
    "America/Vancouver",
    "America/Winnipeg",
    "Asia/Baghdad",
    "Asia/Bangkok",
    "Asia/Beirut",
    "Asia/Colombo",
    "Asia/Dhaka",
    "Asia/Dubai",
    "Asia/Hong_Kong",
    "Asia/Istanbul",
    "Asia/Jakarta",
    "Asia/Jerusalem",
    "Asia/Karachi",
    "Asia/Kathmandu",
    "Asia/Kolkata",
    "Asia/Kuala_Lumpur",
    "Asia/Kuwait",
    "Asia/Manila",
    "Asia/Qatar",
    "Asia/Riyadh",
    "Asia/Seoul",
    "Asia/Shanghai",
    "Asia/Singapore",
    "Asia/Taipei",
    "Asia/Tehran",
    "Asia/Tokyo",
    "Atlantic/Reykjavik",
    "Australia/Adelaide",
    "Australia/Brisbane",
    "Australia/Darwin",
    "Australia/Hobart",
    "Australia/Melbourne",
    "Australia/Perth",
    "Australia/Sydney",
    "Europe/Amsterdam",
    "Europe/Athens",
    "Europe/Belgrade",
    "Europe/Berlin",
    "Europe/Brussels",
    "Europe/Bucharest",
    "Europe/Budapest",
    "Europe/Copenhagen",
    "Europe/Dublin",
    "Europe/Helsinki",
    "Europe/Istanbul",
    "Europe/Kiev",
    "Europe/Lisbon",
    "Europe/London",
    "Europe/Madrid",
    "Europe/Oslo",
    "Europe/Paris",
    "Europe/Prague",
    "Europe/Rome",
    "Europe/Stockholm",
    "Europe/Vienna",
    "Europe/Warsaw",
    "Europe/Zurich",
    "Pacific/Auckland",
    "Pacific/Fiji",
    "Pacific/Guam",
    "Pacific/Honolulu",
  ];
})();

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
