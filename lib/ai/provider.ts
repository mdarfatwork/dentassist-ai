import { env } from "@/config/env";
import { type z } from "zod";
import {
  type AIProvider,
  type AIProviderName,
  type AIProviderErrorCode,
  type AIErrorCode,
  type ChatMessageParam,
  type ToolCallParam,
  type ToolCallResult,
  AIProviderError,
} from "./types";
import {
  sanitizePatientReply,
  BaseOpenAICompatibleProvider,
} from "./base-provider";
import {
  GeminiProvider,
  GroqProvider,
  OpenRouterProvider,
  OpenRouterAIProvider,
} from "./providers";
import {
  AIProviderManager,
  getAIProviderManager,
  setAIProviderManagerForTesting,
} from "./manager";

// Re-export core types and classes
export {
  type AIProvider,
  type AIProviderName,
  type AIProviderErrorCode,
  type AIErrorCode,
  type ChatMessageParam,
  type ToolCallParam,
  type ToolCallResult,
  AIProviderError,
  sanitizePatientReply,
  BaseOpenAICompatibleProvider,
  GeminiProvider,
  GroqProvider,
  OpenRouterProvider,
  OpenRouterAIProvider,
  AIProviderManager,
  getAIProviderManager,
  setAIProviderManagerForTesting,
};

/**
 * Shared heuristic fallback parser for receptionist intent extraction
 * used only when explicitly requested for offline testing without LLM.
 */
export function fallbackHeuristicStructured<T>(params: {
  messages: ChatMessageParam[];
  schema?: z.ZodType<T>;
}): T | null {
  const lastUserMsg =
    params.messages.filter((m) => m.role === "user").pop()?.content || "";
  const lower = lastUserMsg.toLowerCase();

  // Extract service
  let serviceName: string | undefined;
  if (lower.includes("cleaning") || lower.includes("prophylaxis")) {
    serviceName = "cleaning";
  } else if (lower.includes("whitening") || lower.includes("bleach")) {
    serviceName = "whitening";
  } else if (lower.includes("exam") || lower.includes("checkup")) {
    serviceName = "examination";
  } else if (lower.includes("fill")) {
    serviceName = "filling";
  } else if (lower.includes("root canal")) {
    serviceName = "root canal";
  } else if (lower.includes("extract")) {
    serviceName = "extraction";
  }

  // Extract date
  let dateReference: string | undefined;
  if (lower.includes("tomorrow")) dateReference = "tomorrow";
  else if (lower.includes("today")) dateReference = "today";
  else if (lower.includes("monday")) dateReference = "Monday";
  else if (lower.includes("tuesday")) dateReference = "Tuesday";
  else if (lower.includes("wednesday")) dateReference = "Wednesday";
  else if (lower.includes("thursday")) dateReference = "Thursday";
  else if (lower.includes("friday")) dateReference = "Friday";
  else if (lower.includes("saturday")) dateReference = "Saturday";

  // Extract time preference
  let timePreference:
    | { type: "morning" | "afternoon" | "evening" | "exact"; value?: string }
    | undefined;
  if (lower.includes("morning")) timePreference = { type: "morning" };
  else if (lower.includes("afternoon")) timePreference = { type: "afternoon" };
  else if (lower.includes("evening")) timePreference = { type: "evening" };

  // Affirmation / Negation
  const isAffirmation =
    /^(yes|yeah|yep|confirm|please\s*book|book\s*it|sure|ok|okay)/i.test(
      lower.trim(),
    );
  const isNegation = /^(no|nope|cancel)/i.test(lower.trim());

  // Intent
  let intent = "GENERAL_QUESTION";
  if (
    lower.includes("hour") ||
    lower.includes("open") ||
    lower.includes("close")
  ) {
    intent = "CLINIC_HOURS";
  } else if (
    lower.includes("what services") ||
    lower.includes("list services") ||
    lower.includes("do you offer")
  ) {
    intent = "SERVICE_CATALOG";
  } else if (
    lower.includes("available") ||
    lower.includes("slot") ||
    (serviceName &&
      (lower.includes("book") ||
        lower.includes("want") ||
        lower.includes("check") ||
        dateReference))
  ) {
    intent = "CHECK_AVAILABILITY";
  } else if (isAffirmation) {
    intent = "CONFIRM_BOOKING";
  } else if (isNegation) {
    intent = "CANCEL_APPOINTMENT";
  } else if (
    lower.includes("policy") ||
    lower.includes("insurance") ||
    lower.includes("cost") ||
    lower.includes("price") ||
    lower.includes("aftercare")
  ) {
    intent = "KNOWLEDGE_INQUIRY";
  }

  const heuristicObj = {
    intent,
    serviceName,
    dateReference,
    timePreference,
    isAffirmation,
    isNegation,
    unstructuredQuery: lastUserMsg,
  };

  if (params.schema) {
    const validated = params.schema.safeParse(heuristicObj);
    if (validated.success) {
      return validated.data;
    }
  }
  return heuristicObj as T;
}

/**
 * NVIDIA AI Provider (Preserved for backward compatibility)
 */
export class NvidiaAIProvider implements AIProvider {
  public readonly providerName = "nvidia";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any = null;

  private async getClient() {
    if (this.client) return this.client;
    if (!env.NVIDIA_API_KEY) return null;

    const { default: OpenAI } = await import("openai");
    this.client = new OpenAI({
      apiKey: env.NVIDIA_API_KEY,
      baseURL: env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
    });
    return this.client;
  }

  private getCandidateModels(preferredModel?: string): string[] {
    const list = [
      preferredModel,
      env.AI_MODEL,
      env.NVIDIA_LLM_MODEL,
      "nvidia/nemotron-3.5-lightning-30b-a3b",
    ].filter(Boolean) as string[];

    return Array.from(new Set(list));
  }

  public async generateText(params: {
    messages: ChatMessageParam[];
    temperature?: number;
    maxTokens?: number;
    model?: string;
    signal?: AbortSignal;
  }): Promise<string> {
    const client = await this.getClient();
    if (!client) {
      return "Thank you for contacting the clinic. How can I assist you with your dental care today?";
    }

    const candidateModels = this.getCandidateModels(params.model);
    for (const modelToTry of candidateModels) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const effectiveSignal = params.signal || controller.signal;

      try {
        const response = await client.chat.completions.create(
          {
            model: modelToTry,
            messages: params.messages,
            temperature: params.temperature ?? 0.2,
            max_tokens: params.maxTokens ?? 1024,
          },
          { signal: effectiveSignal },
        );

        clearTimeout(timeout);
        const content = response.choices?.[0]?.message?.content || "";
        return sanitizePatientReply(content);
      } catch {
        clearTimeout(timeout);
      }
    }

    return "Thank you for contacting the clinic. How can I assist you with your dental care today?";
  }

  public async generateStructured<T>(params: {
    messages: ChatMessageParam[];
    schema?: z.ZodType<T>;
    schemaName?: string;
    temperature?: number;
    maxTokens?: number;
    model?: string;
    signal?: AbortSignal;
  }): Promise<T | null> {
    const client = await this.getClient();
    if (!client) {
      return fallbackHeuristicStructured<T>(params);
    }

    const candidateModels = this.getCandidateModels(params.model);

    const structuredMessages: ChatMessageParam[] = [
      ...params.messages,
      {
        role: "system",
        content:
          "CRITICAL: Output ONLY a single, valid, raw JSON object matching the requested schema. Do not enclose in markdown ```json code blocks. Do not output explanations, preambles, or thoughts.",
      },
    ];

    for (const modelToTry of candidateModels) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const effectiveSignal = params.signal || controller.signal;

      try {
        const response = await client.chat.completions.create(
          {
            model: modelToTry,
            messages: structuredMessages,
            temperature: params.temperature ?? 0.0,
            max_tokens: params.maxTokens ?? 1024,
            response_format: { type: "json_object" },
          },
          { signal: effectiveSignal },
        );

        clearTimeout(timeout);
        const raw = response.choices?.[0]?.message?.content || "";
        const cleaned = sanitizePatientReply(raw);

        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : cleaned;

        const parsed = JSON.parse(jsonStr);
        if (params.schema) {
          const validated = params.schema.safeParse(parsed);
          if (validated.success) {
            return validated.data;
          }
        } else {
          return parsed as T;
        }
      } catch {
        clearTimeout(timeout);
      }
    }

    return fallbackHeuristicStructured<T>(params);
  }
}

let providerOverride: AIProvider | null = null;

/**
 * Returns the primary AI provider (by default, the AIProviderManager with three-provider failover)
 */
export function getAIProvider(): AIProvider {
  if (providerOverride) {
    return providerOverride;
  }
  return getAIProviderManager();
}

/**
 * Used by tests to override the active AI provider
 */
export function setAIProviderForTesting(provider: AIProvider | null): void {
  providerOverride = provider;
}
