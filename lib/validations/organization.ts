import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Organization name must be at least 2 characters")
    .max(50, "Organization name must be less than 50 characters"),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const switchOrganizationSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
});

export type SwitchOrganizationInput = z.infer<typeof switchOrganizationSchema>;

export const getOrganizationSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
});

export type GetOrganizationInput = z.infer<typeof getOrganizationSchema>;
