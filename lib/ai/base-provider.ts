import { env } from "@/config/env";
import { type z } from "zod";
import {
  type AIProvider,
  type AIProviderName,
  type ChatMessageParam,
  type ToolCallParam,
  type ToolCallResult,
  AIProviderError,
} from "./types";

/**
 * Utility to strip internal reasoning/thinking tokens (such as `<think>...</think>`,
 * "Here's a thinking process:", etc.) so internal model deliberation is never
 * exposed to clinic patients.
 */
export function sanitizePatientReply(rawText: string): string {
  if (!rawText) return "";

  // 1. Remove XML-style thought blocks (e.g. <think>...</think>)
  let cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // 2. Remove common preamble thinking lines if present
  const thinkingHeaders = [
    /^Here(?:'s| is) (?:a |my )?thinking process:?[\s\S]*?(?=\n\n|\n[A-Z])/i,
    /^(?:Thinking Process|Thought Process):?[\s\S]*?(?=\n\n|\n[A-Z])/i,
  ];

  for (const regex of thinkingHeaders) {
    cleaned = cleaned.replace(regex, "").trim();
  }

  return cleaned;
}

export interface BaseProviderOptions {
  providerName: AIProviderName;
  baseURL: string;
  apiKey?: string;
  defaultModel: string;
  defaultHeaders?: Record<string, string>;
}

export abstract class BaseOpenAICompatibleProvider implements AIProvider {
  public readonly providerName: AIProviderName;
  protected readonly baseURL: string;
  protected readonly apiKey?: string;
  protected readonly defaultModel: string;
  protected readonly defaultHeaders?: Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected client: any = null;

  constructor(options: BaseProviderOptions) {
    this.providerName = options.providerName;
    this.baseURL = options.baseURL;
    this.apiKey = options.apiKey;
    this.defaultModel = options.defaultModel;
    this.defaultHeaders = options.defaultHeaders;
  }

  protected async getClient() {
    if (this.client) return this.client;
    if (!this.apiKey) {
      return null;
    }

    const { default: OpenAI } = await import("openai");
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseURL,
      defaultHeaders: this.defaultHeaders,
    });
    return this.client;
  }

  public resolveModel(preferredModel?: string): string {
    return preferredModel || this.defaultModel;
  }

  /**
   * Parses the Retry-After header from an error if present
   */
  protected parseRetryAfter(err: unknown): number | undefined {
    if (!err || typeof err !== "object") return undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const headers = (err as any).headers || (err as any).response?.headers;
    let headerVal: string | undefined;

    if (headers) {
      if (typeof headers.get === "function") {
        headerVal =
          headers.get("retry-after") || headers.get("Retry-After") || undefined;
      } else if (typeof headers === "object") {
        headerVal = headers["retry-after"] || headers["Retry-After"];
      }
    }

    if (!headerVal) {
      // Sometimes providers embed retry_after in json body
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = (err as any).error || (err as any).response?.data?.error;
      if (body?.retry_after) {
        headerVal = String(body.retry_after);
      }
    }

    if (!headerVal) return undefined;

    // Check if numeric (seconds)
    const seconds = Number(headerVal);
    if (!isNaN(seconds) && seconds > 0) {
      return Math.round(seconds * 1000);
    }

    // Check if HTTP Date
    const parsedDate = Date.parse(headerVal);
    if (!isNaN(parsedDate)) {
      const diff = parsedDate - Date.now();
      return diff > 0 ? diff : undefined;
    }

    return undefined;
  }

  public classifyError(err: unknown, model: string): AIProviderError {
    if (err instanceof AIProviderError) {
      return err;
    }

    const msg = err instanceof Error ? err.message : String(err);
    const lowerMsg = msg.toLowerCase();
    const errObj = err as Record<string, unknown> | null | undefined;
    const rawErrorObj = errObj?.error as
      Record<string, unknown> | null | undefined;
    const responseDataObj = (
      errObj?.response as Record<string, unknown> | undefined
    )?.data as Record<string, unknown> | undefined;
    const status = (errObj?.status ?? errObj?.statusCode) as number | undefined;
    const rawError =
      rawErrorObj ??
      (responseDataObj?.error as Record<string, unknown> | undefined);
    const errorCode = String(
      rawError?.code ?? errObj?.code ?? "",
    ).toLowerCase();

    const retryAfterMs = this.parseRetryAfter(err);

    // 1. Authentication & Configuration Errors
    if (
      status === 401 ||
      status === 403 ||
      errorCode.includes("auth") ||
      errorCode.includes("api_key") ||
      lowerMsg.includes("api key") ||
      lowerMsg.includes("unauthorized") ||
      lowerMsg.includes("forbidden") ||
      lowerMsg.includes("authentication")
    ) {
      return new AIProviderError({
        message: `${this.providerName} authentication failed: ${msg}`,
        code: "AUTHENTICATION_ERROR",
        provider: this.providerName,
        model,
        statusCode: status || 401,
        retryable: false,
        cause: err,
      });
    }

    // 2. Rate Limits (429)
    if (
      status === 429 ||
      errorCode === "429" ||
      errorCode.includes("rate_limit") ||
      errorCode.includes("quota") ||
      lowerMsg.includes("429") ||
      lowerMsg.includes("rate limit") ||
      lowerMsg.includes("rate-limited") ||
      lowerMsg.includes("quota exceeded") ||
      lowerMsg.includes("resource has been exhausted")
    ) {
      return new AIProviderError({
        message: `${this.providerName} rate limit reached for model ${model}: ${msg}`,
        code: "RATE_LIMITED",
        provider: this.providerName,
        model,
        statusCode: status || 429,
        retryable: true,
        retryAfterMs,
        cause: err,
      });
    }

    // 3. Model Not Found / Unsupported Configuration
    if (
      status === 404 ||
      status === 410 ||
      errorCode.includes("model_not_found") ||
      lowerMsg.includes("not found") ||
      lowerMsg.includes("decommissioned") ||
      lowerMsg.includes("does not exist")
    ) {
      return new AIProviderError({
        message: `${this.providerName} model unavailable (${model}): ${msg}`,
        code: "CONFIGURATION_ERROR",
        provider: this.providerName,
        model,
        statusCode: status,
        retryable: false,
        cause: err,
      });
    }

    // 4. Timeout
    if (
      status === 408 ||
      status === 504 ||
      lowerMsg.includes("timeout") ||
      lowerMsg.includes("aborted") ||
      lowerMsg.includes("etimedout") ||
      lowerMsg.includes("esockettimedout")
    ) {
      return new AIProviderError({
        message: `${this.providerName} request timed out for model ${model}: ${msg}`,
        code: "TIMEOUT",
        provider: this.providerName,
        model,
        statusCode: status || 504,
        retryable: true,
        cause: err,
      });
    }

    // 5. Network / Connection Errors
    if (
      errorCode.includes("econnrefused") ||
      errorCode.includes("enotfound") ||
      lowerMsg.includes("fetch failed") ||
      lowerMsg.includes("network error") ||
      lowerMsg.includes("connection reset")
    ) {
      return new AIProviderError({
        message: `${this.providerName} network error: ${msg}`,
        code: "NETWORK_ERROR",
        provider: this.providerName,
        model,
        statusCode: status,
        retryable: true,
        cause: err,
      });
    }

    // 6. Generic Provider Error
    return new AIProviderError({
      message: `${this.providerName} error: ${msg}`,
      code: "PROVIDER_ERROR",
      provider: this.providerName,
      model,
      statusCode: status,
      retryable: status ? status >= 500 : true,
      cause: err,
    });
  }

  public async generateText(params: {
    messages: ChatMessageParam[];
    temperature?: number;
    maxTokens?: number;
    model?: string;
    signal?: AbortSignal;
  }): Promise<string> {
    const modelToUse = this.resolveModel(params.model);
    const client = await this.getClient();

    if (!client) {
      throw new AIProviderError({
        message: `${this.providerName} API key is not configured`,
        code: "CONFIGURATION_ERROR",
        provider: this.providerName,
        model: modelToUse,
        retryable: false,
      });
    }

    const timeoutMs = env.AI_REQUEST_TIMEOUT_MS ?? 15000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const signalToUse = controller.signal;
    if (params.signal) {
      // If external signal fires, abort our controller
      params.signal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }

    try {
      const response = await client.chat.completions.create(
        {
          model: modelToUse,
          messages: params.messages,
          temperature: params.temperature ?? 0.2,
          max_tokens: params.maxTokens ?? 1024,
        },
        { signal: signalToUse },
      );

      clearTimeout(timeout);
      const content = response.choices?.[0]?.message?.content || "";
      return sanitizePatientReply(content);
    } catch (err: unknown) {
      clearTimeout(timeout);
      throw this.classifyError(err, modelToUse);
    }
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
    const modelToUse = this.resolveModel(params.model);
    const client = await this.getClient();

    if (!client) {
      throw new AIProviderError({
        message: `${this.providerName} API key is not configured`,
        code: "CONFIGURATION_ERROR",
        provider: this.providerName,
        model: modelToUse,
        retryable: false,
      });
    }

    const structuredMessages: ChatMessageParam[] = [
      ...params.messages,
      {
        role: "system",
        content:
          "CRITICAL: Output ONLY a single, valid, raw JSON object matching the requested schema. Do not enclose in markdown ```json code blocks. Do not output explanations, preambles, or thoughts.",
      },
    ];

    const timeoutMs = env.AI_REQUEST_TIMEOUT_MS ?? 15000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const signalToUse = controller.signal;
    if (params.signal) {
      params.signal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }

    try {
      const response = await client.chat.completions.create(
        {
          model: modelToUse,
          messages: structuredMessages,
          temperature: params.temperature ?? 0.0,
          max_tokens: params.maxTokens ?? 1024,
          response_format: { type: "json_object" },
        },
        { signal: signalToUse },
      );

      clearTimeout(timeout);
      const raw = response.choices?.[0]?.message?.content || "";
      const cleaned = sanitizePatientReply(raw);

      // Extract JSON object if model wrapped with any delimiters
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : cleaned;

      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (parseErr) {
        throw new AIProviderError({
          message: `Malformed JSON produced by ${this.providerName} model ${modelToUse}: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
          code: "INVALID_STRUCTURED_OUTPUT",
          provider: this.providerName,
          model: modelToUse,
          retryable: true,
          cause: parseErr,
        });
      }

      if (params.schema) {
        const validated = params.schema.safeParse(parsed);
        if (validated.success) {
          return validated.data;
        }
        throw new AIProviderError({
          message: `Schema validation failed for ${this.providerName} model ${modelToUse}: ${JSON.stringify(validated.error.format())}`,
          code: "INVALID_STRUCTURED_OUTPUT",
          provider: this.providerName,
          model: modelToUse,
          retryable: true,
          cause: validated.error,
        });
      }

      return parsed as T;
    } catch (err: unknown) {
      clearTimeout(timeout);
      throw this.classifyError(err, modelToUse);
    }
  }

  public async callTool(params: {
    messages: ChatMessageParam[];
    tools: ToolCallParam[];
    toolChoice?:
      "auto" | "required" | { type: "function"; function: { name: string } };
    temperature?: number;
    maxTokens?: number;
    model?: string;
    signal?: AbortSignal;
  }): Promise<ToolCallResult | null> {
    const modelToUse = this.resolveModel(params.model);
    const client = await this.getClient();

    if (!client) {
      throw new AIProviderError({
        message: `${this.providerName} API key is not configured`,
        code: "CONFIGURATION_ERROR",
        provider: this.providerName,
        model: modelToUse,
        retryable: false,
      });
    }

    const timeoutMs = env.AI_REQUEST_TIMEOUT_MS ?? 15000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const signalToUse = controller.signal;
    if (params.signal) {
      params.signal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }

    try {
      const response = await client.chat.completions.create(
        {
          model: modelToUse,
          messages: params.messages,
          tools: params.tools,
          tool_choice: params.toolChoice || "auto",
          temperature: params.temperature ?? 0.0,
          max_tokens: params.maxTokens ?? 1024,
        },
        { signal: signalToUse },
      );

      clearTimeout(timeout);
      const toolCall = response.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) return null;

      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = JSON.parse(toolCall.function.arguments || "{}");
      } catch (parseErr) {
        throw new AIProviderError({
          message: `Malformed tool call arguments from ${this.providerName}: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
          code: "INVALID_STRUCTURED_OUTPUT",
          provider: this.providerName,
          model: modelToUse,
          retryable: true,
          cause: parseErr,
        });
      }

      return {
        id: toolCall.id,
        name: toolCall.function.name,
        args: parsedArgs,
      };
    } catch (err: unknown) {
      clearTimeout(timeout);
      throw this.classifyError(err, modelToUse);
    }
  }
}
