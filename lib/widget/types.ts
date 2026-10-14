import { z } from "zod";

export const widgetLauncherPositionSchema = z.enum([
  "bottom-right",
  "bottom-left",
]);
export type WidgetLauncherPosition = z.infer<
  typeof widgetLauncherPositionSchema
>;

export const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const updateWidgetSettingsSchema = z.object({
  name: z.string().trim().min(1, "Widget name is required").max(60),
  assistantName: z.string().trim().min(1, "Assistant name is required").max(50),
  welcomeMessage: z
    .string()
    .trim()
    .min(1, "Welcome message is required")
    .max(280),
  primaryColor: z
    .string()
    .trim()
    .regex(
      hexColorRegex,
      "Primary color must be a valid hex code (e.g. #1E40AF)",
    ),
  launcherPosition: widgetLauncherPositionSchema,
  showBranding: z.boolean(),
  enableChat: z.boolean(),
  enableVoice: z.boolean(),
});

export type UpdateWidgetSettingsInput = z.infer<
  typeof updateWidgetSettingsSchema
>;

export const updateAllowedDomainsSchema = z.object({
  allowedDomains: z.array(z.string().trim().min(1)).max(50),
});

export type UpdateAllowedDomainsInput = z.infer<
  typeof updateAllowedDomainsSchema
>;

export interface PublicWidgetConfig {
  publicId: string;
  clinicName: string;
  assistantName: string;
  welcomeMessage: string;
  primaryColor: string;
  launcherPosition: WidgetLauncherPosition;
  showBranding: boolean;
  enableChat: boolean;
  enableVoice: boolean;
  timezone: string;
}

export interface WidgetSessionVerificationResult {
  widgetId: string;
  organizationId: string;
  conversationId: string;
}
