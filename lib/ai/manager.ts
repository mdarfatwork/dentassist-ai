import { env } from "@/config/env";
import { type z } from "zod";
import {
  type AIProvider,
  type AIProviderName,
  type ChatMessageParam,
  type ToolCallParam,
  type ToolCallResult,
  type AIMetricsSnapshot,
  AIProviderError,
} from "./types";
import { ProviderCircuitBreaker } from "./circuit-breaker";
import { GeminiProvider, GroqProvider, OpenRouterProvider } from "./providers";

export interface ManagedProviderEntry {
  name: AIProviderName;
  priority: number;
  model: string;
  provider: AIProvider;
}

export class AIProviderManager implements AIProvider {
  public readonly providerName = "manager";
  private circuitBreaker: ProviderCircuitBreaker;
  private providers: ManagedProviderEntry[] = [];

  // Metrics collection
  private metrics: {
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
    latencies: Record<AIProviderName, number[]>;
  } = {
    ai_requests_total: 0,
    ai_requests_success: 0,
    ai_requests_failed: 0,
    ai_provider_rate_limited: 0,
    ai_provider_timeout: 0,
    ai_provider_errors: 0,
    ai_failover_total: 0,
    ai_provider_skipped: 0,
    ai_provider_circuit_open: 0,
    ai_provider_circuit_closed: 0,
    latencies: {
      gemini: [],
      groq: [],
      openrouter: [],
    },
  };

  constructor(options?: { circuitBreaker?: ProviderCircuitBreaker }) {
    this.circuitBreaker =
      options?.circuitBreaker ??
      new ProviderCircuitBreaker({
        failureThreshold: env.AI_FAILURE_THRESHOLD ?? 1,
      });

    this.registerDefaultProviders();
  }

  private registerDefaultProviders(): void {
    const p1Name = (env.AI_PROVIDER_1 as AIProviderName) || "gemini";
    const p2Name = (env.AI_PROVIDER_2 as AIProviderName) || "groq";
    const p3Name = (env.AI_PROVIDER_3 as AIProviderName) || "openrouter";

    this.providers = [
      {
        name: p1Name,
        priority: env.AI_PRIORITY_1 ?? 1,
        model: env.AI_MODEL_1 || "gemini-2.5-flash-lite",
        provider: new GeminiProvider(),
      },
      {
        name: p2Name,
        priority: env.AI_PRIORITY_2 ?? 2,
        model: env.AI_MODEL_2 || "openai/gpt-oss-20b",
        provider: new GroqProvider(),
      },
      {
        name: p3Name,
        priority: env.AI_PRIORITY_3 ?? 3,
        model: env.AI_MODEL_3 || env.AI_MODEL || "google/gemma-4-31b-it:free",
        provider: new OpenRouterProvider(),
      },
    ];
  }

  /**
   * For testing: override providers
   */
  public setProvidersForTesting(providers: ManagedProviderEntry[]): void {
    this.providers = [...providers];
  }

  public getCircuitBreaker(): ProviderCircuitBreaker {
    return this.circuitBreaker;
  }

  /**
   * Returns healthy providers sorted in ascending order of priority (1 = highest)
   */
  public getSortedProviders(): ManagedProviderEntry[] {
    return [...this.providers].sort((a, b) => a.priority - b.priority);
  }

  private recordLatency(provider: AIProviderName, latencyMs: number) {
    if (!this.metrics.latencies[provider]) {
      this.metrics.latencies[provider] = [];
    }
    const arr = this.metrics.latencies[provider];
    arr.push(latencyMs);
    if (arr.length > 500) {
      arr.shift();
    }
  }

  public getMetrics(): AIMetricsSnapshot {
    const latenciesSummary: Record<
      AIProviderName,
      {
        count: number;
        avgLatencyMs: number;
        p95LatencyMs: number;
        lastLatencyMs: number;
      }
    > = {
      gemini: { count: 0, avgLatencyMs: 0, p95LatencyMs: 0, lastLatencyMs: 0 },
      groq: { count: 0, avgLatencyMs: 0, p95LatencyMs: 0, lastLatencyMs: 0 },
      openrouter: {
        count: 0,
        avgLatencyMs: 0,
        p95LatencyMs: 0,
        lastLatencyMs: 0,
      },
    };

    for (const name of ["gemini", "groq", "openrouter"] as AIProviderName[]) {
      const vals = this.metrics.latencies[name] || [];
      if (vals.length > 0) {
        const sorted = [...vals].sort((a, b) => a - b);
        const sum = vals.reduce((acc, v) => acc + v, 0);
        const p95Idx = Math.min(
          sorted.length - 1,
          Math.floor(sorted.length * 0.95),
        );
        latenciesSummary[name] = {
          count: vals.length,
          avgLatencyMs: Math.round(sum / vals.length),
          p95LatencyMs: Math.round(sorted[p95Idx]),
          lastLatencyMs: Math.round(vals[vals.length - 1]),
        };
      }
    }

    return {
      ai_requests_total: this.metrics.ai_requests_total,
      ai_requests_success: this.metrics.ai_requests_success,
      ai_requests_failed: this.metrics.ai_requests_failed,
      ai_provider_rate_limited: this.metrics.ai_provider_rate_limited,
      ai_provider_timeout: this.metrics.ai_provider_timeout,
      ai_provider_errors: this.metrics.ai_provider_errors,
      ai_failover_total: this.metrics.ai_failover_total,
      ai_provider_skipped: this.metrics.ai_provider_skipped,
      ai_provider_circuit_open: this.metrics.ai_provider_circuit_open,
      ai_provider_circuit_closed: this.metrics.ai_provider_circuit_closed,
      latencies: latenciesSummary,
    };
  }

  public resetMetrics(): void {
    this.metrics = {
      ai_requests_total: 0,
      ai_requests_success: 0,
      ai_requests_failed: 0,
      ai_provider_rate_limited: 0,
      ai_provider_timeout: 0,
      ai_provider_errors: 0,
      ai_failover_total: 0,
      ai_provider_skipped: 0,
      ai_provider_circuit_open: 0,
      ai_provider_circuit_closed: 0,
      latencies: {
        gemini: [],
        groq: [],
        openrouter: [],
      },
    };
  }

  public resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  /**
   * Generic execution harness that iterates over sorted providers with circuit breaker and failover
   */
  private async executeWithFailover<R>(
    operationName: "generateText" | "generateStructured" | "callTool",
    executeFn: (provider: AIProvider, model: string) => Promise<R>,
  ): Promise<{ result: R; providerName: AIProviderName; model: string }> {
    const sorted = this.getSortedProviders();
    const totalProviders = Math.min(sorted.length, 3); // Attempt at most 3 providers per request
    const errors: AIProviderError[] = [];

    for (let i = 0; i < totalProviders; i++) {
      const entry = sorted[i];
      const check = this.circuitBreaker.isEligible(entry.name);

      if (!check.eligible) {
        this.metrics.ai_provider_skipped += 1;
        console.warn(
          `[AI] provider=${entry.name} status=SKIPPED reason=${check.reason} cooldownRemainingMs=${check.cooldownRemainingMs || 0}`,
        );
        continue;
      }

      // Provider is eligible (CLOSED or designated HALF_OPEN probe)
      this.metrics.ai_requests_total += 1;
      const startTime = performance.now();

      try {
        const result = await executeFn(entry.provider, entry.model);
        const latencyMs = Math.round(performance.now() - startTime);
        this.recordLatency(entry.name, latencyMs);

        const prevState = this.circuitBreaker.getState(entry.name).state;
        this.circuitBreaker.recordSuccess(entry.name);

        if (prevState === "HALF_OPEN") {
          this.metrics.ai_provider_circuit_closed += 1;
        }
        this.metrics.ai_requests_success += 1;

        console.info(
          `[AI] provider=${entry.name} operation=${operationName} model=${entry.model} status=SUCCESS latencyMs=${latencyMs} circuit=CLOSED`,
        );

        return { result, providerName: entry.name, model: entry.model };
      } catch (err: unknown) {
        const latencyMs = Math.round(performance.now() - startTime);
        this.recordLatency(entry.name, latencyMs);
        this.metrics.ai_requests_failed += 1;

        const classified =
          err instanceof AIProviderError
            ? err
            : new AIProviderError({
                message: err instanceof Error ? err.message : String(err),
                code: "UNKNOWN",
                provider: entry.name,
                model: entry.model,
                cause: err,
              });

        errors.push(classified);

        // Update circuit breaker
        const { circuitChanged, newState } = this.circuitBreaker.recordFailure(
          entry.name,
          classified,
        );

        if (circuitChanged && newState === "OPEN") {
          this.metrics.ai_provider_circuit_open += 1;
        }

        // Track error type metrics
        if (classified.code === "RATE_LIMITED") {
          this.metrics.ai_provider_rate_limited += 1;
        } else if (classified.code === "TIMEOUT") {
          this.metrics.ai_provider_timeout += 1;
        } else {
          this.metrics.ai_provider_errors += 1;
        }

        // Determine next provider for log
        let nextProviderName: string | undefined;
        for (let j = i + 1; j < totalProviders; j++) {
          const nextCandidate = sorted[j];
          if (this.circuitBreaker.isEligible(nextCandidate.name).eligible) {
            nextProviderName = nextCandidate.name;
            break;
          }
        }

        this.metrics.ai_failover_total += 1;

        console.warn(
          `[AI] provider=${entry.name} operation=${operationName} model=${entry.model} status=${classified.code} latencyMs=${latencyMs} circuit=${newState} failover=true nextProvider=${nextProviderName || "none"}`,
        );
      }
    }

    // All available providers failed or are in cooldown
    console.error(
      `[AI] All providers exhausted for operation ${operationName}. Failures:`,
      errors.map((e) => ({
        provider: e.provider,
        code: e.code,
        message: e.message,
      })),
    );

    throw new AIProviderError({
      message:
        "All LLM providers are temporarily unavailable. Please try again in a moment.",
      code: "AI_SERVICE_TEMPORARILY_UNAVAILABLE",
      provider: "manager",
      retryable: true,
      cause: errors.length > 0 ? errors[errors.length - 1] : undefined,
    });
  }

  public async generateText(params: {
    messages: ChatMessageParam[];
    temperature?: number;
    maxTokens?: number;
    model?: string;
    signal?: AbortSignal;
  }): Promise<string> {
    const { result } = await this.executeWithFailover(
      "generateText",
      (provider, model) =>
        provider.generateText({
          ...params,
          model: params.model || model,
        }),
    );
    return result;
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
    const { result } = await this.executeWithFailover(
      "generateStructured",
      (provider, model) =>
        provider.generateStructured<T>({
          ...params,
          model: params.model || model,
        }),
    );
    return result;
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
    const { result } = await this.executeWithFailover(
      "callTool",
      (provider, model) => {
        if (typeof provider.callTool === "function") {
          return provider.callTool({
            ...params,
            model: params.model || model,
          });
        }
        throw new AIProviderError({
          message: `Provider ${provider.providerName} does not support tool calling`,
          code: "UNSUPPORTED_OPERATION",
          provider: provider.providerName,
          retryable: false,
        });
      },
    );
    return result;
  }

  /**
   * Health status inspection
   */
  public getHealthStatus(): {
    status: "healthy" | "degraded" | "unavailable";
    providers: Record<
      AIProviderName,
      {
        state: string;
        priority: number;
        model: string;
        cooldownRemainingMs: number;
        consecutiveFailures: number;
      }
    >;
    metrics: AIMetricsSnapshot;
  } {
    const circuits = this.circuitBreaker.getAllCircuits();
    const sorted = this.getSortedProviders();

    const providerMap = {} as Record<
      AIProviderName,
      {
        state: string;
        priority: number;
        model: string;
        cooldownRemainingMs: number;
        consecutiveFailures: number;
      }
    >;

    let healthyCount = 0;
    for (const entry of sorted) {
      const c = circuits[entry.name];
      if (c.state === "CLOSED") {
        healthyCount++;
      }
      providerMap[entry.name] = {
        state: c.state,
        priority: entry.priority,
        model: entry.model,
        cooldownRemainingMs: c.cooldownRemainingMs,
        consecutiveFailures: c.consecutiveFailures,
      };
    }

    const status: "healthy" | "degraded" | "unavailable" =
      healthyCount === sorted.length
        ? "healthy"
        : healthyCount > 0
          ? "degraded"
          : "unavailable";

    return {
      status,
      providers: providerMap,
      metrics: this.getMetrics(),
    };
  }
}

let providerManagerInstance: AIProviderManager | null = null;

export function getAIProviderManager(): AIProviderManager {
  if (!providerManagerInstance) {
    providerManagerInstance = new AIProviderManager();
  }
  return providerManagerInstance;
}

export function setAIProviderManagerForTesting(
  manager: AIProviderManager | null,
): void {
  providerManagerInstance = manager;
}
