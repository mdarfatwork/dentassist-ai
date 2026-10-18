/**
 * AI Execution Trace and Observability System
 *
 * Lightweight, typed observability infrastructure for DentAssist AI Receptionist.
 * Measures monotonic latencies, records factual pipeline lifecycle events,
 * redacts sensitive information, and enforces strict organization-scoped isolation.
 */

export interface AITraceEvent {
  id: string;
  sequence: number;
  stage: string;
  status: "started" | "completed" | "failed" | "skipped" | "blocked";
  timestamp: string; // ISO 8601
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface AITraceTool {
  id: string;
  name: string;
  status: "requested" | "executed" | "rejected" | "skipped" | "failed";
  durationMs?: number;
  input: Record<string, unknown>; // Validated and redacted
  output?: unknown; // Safe summarized output
  error?: string;
}

export interface AITraceSource {
  documentId: string;
  documentName: string;
  headingPath?: string | null;
  pageNumber?: number | null;
  score?: number;
  chunkCount?: number;
  durationMs?: number;
  excerpt?: string;
}

export interface AITraceError {
  stage: string;
  code: string;
  message: string;
  timestamp: string;
}

export interface AITraceTokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface AITrace {
  id: string; // Trace ID, e.g. "trc_..."
  turnId: string; // Server-generated Turn ID, e.g. "turn_..."
  conversationId: string;
  organizationId: string;
  channel: "chat" | "voice";
  startedAt: string;
  completedAt?: string;
  totalDurationMs: number;
  status: "success" | "partial_success" | "blocked" | "failed";

  // Diagnostic overview
  intent?: string;
  entities?: Record<string, unknown>;
  provider?: string;
  model?: string;
  tokenUsage?: AITraceTokenUsage;

  // Latency breakdown (monotonic measurements)
  latencies: {
    totalMs: number;
    promptGuardMs?: number;
    intentExtractionMs?: number;
    serviceResolutionMs?: number;
    ragMs?: number;
    toolExecutionMs?: number;
    responseGenerationMs?: number;
    persistenceMs?: number;
    [key: string]: number | undefined;
  };

  // Event sequence
  events: AITraceEvent[];

  // Knowledge retrieval results
  retrievedSources?: AITraceSource[];

  // Tool executions
  tools: AITraceTool[];

  // Errors and failovers
  errors: AITraceError[];
}

export interface AITraceSummary {
  id: string;
  turnId: string;
  conversationId: string;
  organizationId: string;
  channel: "chat" | "voice";
  startedAt: string;
  totalDurationMs: number;
  status: "success" | "partial_success" | "blocked" | "failed";
  intent?: string;
  provider?: string;
  model?: string;
}

/**
 * Sensitive fields to redact from trace logs, inputs, and metadata.
 */
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /auth/i,
  /key$/i,
  /credential/i,
  /cookie/i,
  /bearer/i,
  /ssn/i,
  /credit[-_]?card/i,
];

export function redactSensitiveData(obj: unknown, depth = 0): unknown {
  if (depth > 6) return "[Truncated: Max Depth]";
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    // Redact Bearer tokens
    if (/bearer\s+[a-zA-Z0-9_\-\.]+/i.test(obj)) {
      return obj.replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, "Bearer [REDACTED]");
    }
    // Truncate excessively long strings
    if (obj.length > 500) {
      return `${obj.slice(0, 500)}... [truncated ${obj.length - 500} chars]`;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.slice(0, 20).map((item) => redactSensitiveData(item, depth + 1));
  }

  if (typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) =>
        pattern.test(key),
      );
      if (isSensitive) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = redactSensitiveData(val, depth + 1);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * High-resolution Trace Collector for a single turn in the AI receptionist pipeline.
 */
export class AITraceCollector {
  public readonly traceId: string;
  public readonly turnId: string;
  public readonly conversationId: string;
  public readonly organizationId: string;
  public readonly channel: "chat" | "voice";

  private startTime: number;
  private startedAtIso: string;
  private sequenceCounter = 0;
  private events: AITraceEvent[] = [];
  private tools: AITraceTool[] = [];
  private sources: AITraceSource[] = [];
  private errors: AITraceError[] = [];
  private activeTimers = new Map<string, number>();

  private intent?: string;
  private entities?: Record<string, unknown>;
  private provider?: string;
  private model?: string;
  private tokenUsage?: AITraceTokenUsage;
  private status: "success" | "partial_success" | "blocked" | "failed" =
    "success";

  constructor(params: {
    conversationId: string;
    organizationId: string;
    channel?: "chat" | "voice";
    traceId?: string;
    turnId?: string;
  }) {
    this.startTime = performance.now();
    this.startedAtIso = new Date().toISOString();
    this.conversationId = params.conversationId;
    this.organizationId = params.organizationId;
    this.channel = params.channel || "chat";
    this.traceId =
      params.traceId ||
      `trc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.turnId =
      params.turnId ||
      `turn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Starts a timed stage and returns a completion callback.
   */
  public startStage(
    stage: string,
    metadata?: Record<string, unknown>,
  ): (
    status?: "completed" | "failed" | "skipped" | "blocked",
    meta?: Record<string, unknown>,
  ) => number {
    const stageStartTime = performance.now();
    this.activeTimers.set(stage, stageStartTime);

    this.recordEvent({
      stage,
      status: "started",
      metadata,
    });

    return (
      status: "completed" | "failed" | "skipped" | "blocked" = "completed",
      meta?: Record<string, unknown>,
    ) => {
      const now = performance.now();
      const started = this.activeTimers.get(stage) ?? stageStartTime;
      const durationMs = Number((now - started).toFixed(1));
      this.activeTimers.delete(stage);

      this.recordEvent({
        stage,
        status,
        durationMs,
        metadata: { ...(metadata || {}), ...(meta || {}) },
      });

      return durationMs;
    };
  }

  /**
   * Records an explicit event in the chronological trace.
   */
  public recordEvent(params: {
    stage: string;
    status: "started" | "completed" | "failed" | "skipped" | "blocked";
    durationMs?: number;
    metadata?: Record<string, unknown>;
  }): void {
    this.sequenceCounter += 1;
    this.events.push({
      id: `evt_${this.sequenceCounter}_${Math.random().toString(36).substring(2, 6)}`,
      sequence: this.sequenceCounter,
      stage: params.stage,
      status: params.status,
      timestamp: new Date().toISOString(),
      durationMs: params.durationMs,
      metadata: params.metadata
        ? (redactSensitiveData(params.metadata) as Record<string, unknown>)
        : undefined,
    });
  }

  /**
   * Records an executed or requested tool call.
   */
  public recordToolCall(tool: {
    id: string;
    name: string;
    status?: "requested" | "executed" | "rejected" | "skipped" | "failed";
    durationMs?: number;
    input: Record<string, unknown>;
    output?: unknown;
    error?: string;
  }): void {
    this.tools.push({
      id: tool.id,
      name: tool.name,
      status: tool.status || (tool.error ? "failed" : "executed"),
      durationMs: tool.durationMs,
      input: redactSensitiveData(tool.input) as Record<string, unknown>,
      output: tool.output ? redactSensitiveData(tool.output) : undefined,
      error: tool.error,
    });
  }

  /**
   * Records knowledge retrieval sources.
   */
  public recordSources(sources: AITraceSource[]): void {
    for (const src of sources) {
      this.sources.push({
        documentId: src.documentId,
        documentName: src.documentName,
        headingPath: src.headingPath,
        pageNumber: src.pageNumber,
        score: src.score,
        chunkCount: src.chunkCount,
        durationMs: src.durationMs,
        excerpt: src.excerpt
          ? src.excerpt.length > 240
            ? `${src.excerpt.slice(0, 240)}...`
            : src.excerpt
          : undefined,
      });
    }
  }

  /**
   * Sets the detected intent and extracted entities.
   */
  public setIntentAndEntities(params: {
    intent?: string;
    entities?: Record<string, unknown>;
    provider?: string;
    model?: string;
    tokenUsage?: AITraceTokenUsage;
  }): void {
    if (params.intent) this.intent = params.intent;
    if (params.entities) {
      this.entities = redactSensitiveData(params.entities) as Record<
        string,
        unknown
      >;
    }
    if (params.provider) this.provider = params.provider;
    if (params.model) this.model = params.model;
    if (params.tokenUsage) this.tokenUsage = params.tokenUsage;
  }

  /**
   * Records an error or provider failover in the trace.
   */
  public recordError(params: {
    stage: string;
    code: string;
    message: string;
  }): void {
    this.errors.push({
      stage: params.stage,
      code: params.code,
      message: params.message,
      timestamp: new Date().toISOString(),
    });

    if (this.status === "success") {
      this.status = "partial_success";
    }
  }

  /**
   * Overrides or locks the final status.
   */
  public setStatus(
    status: "success" | "partial_success" | "blocked" | "failed",
  ): void {
    this.status = status;
  }

  /**
   * Builds the finalized, immutable AITrace record and saves it in the TraceStore.
   */
  public complete(
    finalStatus?: "success" | "partial_success" | "blocked" | "failed",
  ): AITrace {
    const totalDurationMs = Number(
      (performance.now() - this.startTime).toFixed(1),
    );
    const completedAt = new Date().toISOString();

    if (finalStatus) {
      this.status = finalStatus;
    }

    // Compute stage latencies from completed events
    const latencies: Record<string, number> = {
      totalMs: totalDurationMs,
    };

    for (const evt of this.events) {
      if (evt.status === "completed" && evt.durationMs !== undefined) {
        latencies[evt.stage] = evt.durationMs;
      }
    }

    // Map common key latencies
    const trace: AITrace = {
      id: this.traceId,
      turnId: this.turnId,
      conversationId: this.conversationId,
      organizationId: this.organizationId,
      channel: this.channel,
      startedAt: this.startedAtIso,
      completedAt,
      totalDurationMs,
      status: this.status,
      intent: this.intent,
      entities: this.entities,
      provider: this.provider,
      model: this.model,
      tokenUsage: this.tokenUsage,
      latencies: {
        totalMs: totalDurationMs,
        promptGuardMs: latencies["Prompt Guard Security Check"],
        intentExtractionMs: latencies["Intent & Entity Extraction"],
        serviceResolutionMs: latencies["Service Resolution"],
        ragMs:
          latencies["Tool [searchKnowledge]"] || latencies["RAG Retrieval"],
        toolExecutionMs: this.tools.reduce(
          (acc, t) => acc + (t.durationMs || 0),
          0,
        ),
        responseGenerationMs: latencies["Response Generation"],
        persistenceMs: latencies["DB Save Assistant Response"],
        ...latencies,
      },
      events: this.events,
      retrievedSources: this.sources.length > 0 ? this.sources : undefined,
      tools: this.tools,
      errors: this.errors,
    };

    TraceStore.saveTrace(trace);
    return trace;
  }
}

/**
 * Organization-scoped in-memory LRU Trace Store.
 * Provides fast, strictly tenant-isolated trace retrieval with memory bounds.
 */
class TraceStoreImpl {
  private traces = new Map<string, AITrace>(); // keyed by traceId
  private orgIndex = new Map<string, Set<string>>(); // orgId -> Set of traceIds
  private convoIndex = new Map<string, Set<string>>(); // convoId -> Set of traceIds
  private readonly maxTraces = 2000;

  public saveTrace(trace: AITrace): void {
    // Evict oldest trace if capacity exceeded
    if (this.traces.size >= this.maxTraces) {
      const firstKey = this.traces.keys().next().value;
      if (firstKey) {
        this.evictTrace(firstKey);
      }
    }

    this.traces.set(trace.id, trace);

    // Index by organization
    let orgSet = this.orgIndex.get(trace.organizationId);
    if (!orgSet) {
      orgSet = new Set();
      this.orgIndex.set(trace.organizationId, orgSet);
    }
    orgSet.add(trace.id);

    // Index by conversation
    let convoSet = this.convoIndex.get(trace.conversationId);
    if (!convoSet) {
      convoSet = new Set();
      this.convoIndex.set(trace.conversationId, convoSet);
    }
    convoSet.add(trace.id);
  }

  /**
   * Retrieves a trace ensuring strict tenant boundary isolation.
   */
  public getTrace(organizationId: string, traceId: string): AITrace | null {
    const trace = this.traces.get(traceId);
    if (!trace) return null;
    if (trace.organizationId !== organizationId) {
      // Cross-tenant access attempt strictly rejected
      return null;
    }
    return trace;
  }

  /**
   * Retrieves a trace by turnId and conversationId ensuring tenant boundary.
   */
  public getTurnTrace(
    organizationId: string,
    conversationId: string,
    turnId: string,
  ): AITrace | null {
    const convoSet = this.convoIndex.get(conversationId);
    if (!convoSet) return null;

    for (const traceId of convoSet) {
      const trace = this.traces.get(traceId);
      if (
        trace &&
        trace.turnId === turnId &&
        trace.organizationId === organizationId
      ) {
        return trace;
      }
    }
    return null;
  }

  /**
   * Lists all turn traces for a conversation in chronological order.
   */
  public listConversationTraces(
    organizationId: string,
    conversationId: string,
  ): AITrace[] {
    const convoSet = this.convoIndex.get(conversationId);
    if (!convoSet) return [];

    const result: AITrace[] = [];
    for (const traceId of convoSet) {
      const trace = this.traces.get(traceId);
      if (trace && trace.organizationId === organizationId) {
        result.push(trace);
      }
    }

    return result.sort(
      (a, b) =>
        new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    );
  }

  /**
   * Clears traces for a conversation.
   */
  public clearConversationTraces(
    organizationId: string,
    conversationId: string,
  ): void {
    const convoSet = this.convoIndex.get(conversationId);
    if (!convoSet) return;

    for (const traceId of Array.from(convoSet)) {
      const trace = this.traces.get(traceId);
      if (trace && trace.organizationId === organizationId) {
        this.evictTrace(traceId);
      }
    }
    this.convoIndex.delete(conversationId);
  }

  /**
   * Clears all traces (used in test suite reset).
   */
  public clearAllForTesting(): void {
    this.traces.clear();
    this.orgIndex.clear();
    this.convoIndex.clear();
  }

  private evictTrace(traceId: string): void {
    const trace = this.traces.get(traceId);
    if (trace) {
      this.orgIndex.get(trace.organizationId)?.delete(traceId);
      this.convoIndex.get(trace.conversationId)?.delete(traceId);
      this.traces.delete(traceId);
    }
  }
}

export const TraceStore = new TraceStoreImpl();
