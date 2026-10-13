import { z } from "zod";

export const voiceTurnInputSchema = z.object({
  conversationId: z
    .string()
    .min(1, "Conversation ID cannot be empty")
    .optional(),
  transcript: z
    .string()
    .trim()
    .min(1, "Spoken transcript cannot be empty")
    .max(1000, "Spoken transcript exceeds maximum limit of 1000 characters"),
  language: z.string().min(2).max(10).optional().default("en-US"),
});

export type VoiceTurnInputSchema = z.infer<typeof voiceTurnInputSchema>;

export const voiceTurnResponseSchema = z.object({
  conversationId: z.string(),
  responseText: z.string(),
  bookingState: z.any().optional(),
  toolCalls: z.array(z.any()).optional(),
  sources: z.array(z.any()).optional(),
  telemetry: z.any().optional(),
  isSecurityFlagged: z.boolean().optional(),
  securityNotice: z.string().optional(),
});

export type VoiceTurnResponseSchema = z.infer<typeof voiceTurnResponseSchema>;
