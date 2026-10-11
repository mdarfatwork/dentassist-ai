import { type z } from "zod";

export type AIProviderName = "gemini" | "groq" | "openrouter";

export type AIProviderErrorCode =
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "PROVIDER_ERROR"
  | "INVALID_STRUCTURED_OUTPUT"
  | "AUTHENTICATION_ERROR"
  | "CONFIGURATION_ERROR"
  | "UNSUPPORTED_OPERATION"
  | "AI_SERVICE_TEMPORARILY_UNAVAILABLE"
  | "UNKNOWN";

// Backward compatibility alias
export type AIErrorCode =
  | AIProviderErrorCode
  | "MODEL_TIMEOUT"
  | "MODEL_UNAVAILABLE"
  | "STRUCTURED_OUTPUT_INVALID"
  | "TOOL_CALL_INVALID"
  | "PROVIDER_AUTH_ERROR";

export class AIProviderError extends Error {
  public readonly code: AIProviderErrorCode;
  public readonly provider: AIProviderName | string;
  public readonly model?: string;
  public readonly statusCode?: number;
  public readonly retryable: boolean;
  public readonly retryAfterMs?: number;

  constructor(params: {
    message: string;
    code: AIProviderErrorCode;
    provider: AIProviderName | string;
    model?: string;
    statusCode?: number;
    retryable?: boolean;
    retryAfterMs?: number;
    cause?: unknown;
  }) {
    super(params.message);
    this.name = "AIProviderError";
    this.code = params.code;
    this.provider = params.provider;
    this.model = params.model;
    this.statusCode = params.statusCode;
    this.retryable =
      params.retryable ??
      (params.code === "RATE_LIMITED" ||
        params.code === "TIMEOUT" ||
        params.code === "PROVIDER_ERROR" ||
        params.code === "NETWORK_ERROR");
    this.retryAfterMs = params.retryAfterMs;
    if (params.cause) {
      this.cause = params.cause;
    }
  }
}

export interface ChatMessageParam {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ToolCallParam {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCallResult {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface AIProvider {
  readonly providerName: string;

  generateText(params: {
    messages: ChatMessageParam[];
    temperature?: number;
    maxTokens?: number;
    model?: string;
    signal?: AbortSignal;
  }): Promise<string>;

  generateStructured<T>(params: {
    messages: ChatMessageParam[];
    schema?: z.ZodType<T>;
    schemaName?: string;
    temperature?: number;
    maxTokens?: number;
    model?: string;
    signal?: AbortSignal;
  }): Promise<T | null>;

  callTool?(params: {
    messages: ChatMessageParam[];
    tools: ToolCallParam[];
    toolChoice?:
      "auto" | "required" | { type: "function"; function: { name: string } };
    temperature?: number;
    maxTokens?: number;
    model?: string;
    signal?: AbortSignal;
  }): Promise<ToolCallResult | null>;
}

export type ProviderCircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface ProviderCircuit {
  state: ProviderCircuitState;
  consecutiveFailures: number;
  openedAt?: number;
  cooldownUntil?: number;
  lastFailureCode?: AIProviderErrorCode;
  lastFailureAt?: number;
  halfOpenInFlight: boolean;
}

export interface AIMetricsSnapshot {
  ai_requests_total: number;
  ai_requests_success: number;
  ai_requests_failed: number;
  ai_provider_rate_limited: number;
  ai_provider_timeout: number;
  ai_provider_errors: number;
  ai_failover_total: number;
  ai_provider_skipped: number;
  ai_provider_circuit_open: number;
  ai_provider_circuit_closed: number;
  latencies: Record<
    AIProviderName,
    {
      count: number;
      avgLatencyMs: number;
      p95LatencyMs: number;
      lastLatencyMs: number;
    }
  >;
}
