import { env } from "@/config/env";
import { type ReceptionistTelemetry } from "./types";

/**
 * High-resolution Latency Profiler for AI Receptionist Pipeline
 * Measures each phase of the conversation lifecycle (Prompt Guard, DB queries,
 * LLM invocations, Tool executions, and Streaming) and prints a structured summary.
 */

export interface LatencyStage {
  name: string;
  durationMs: number;
  details?: Record<string, unknown>;
}

export class ReceptionistProfiler {
  private startTime: number;
  private stages: LatencyStage[] = [];
  private activeStages: Map<string, number> = new Map();
  private readonly contextInfo: {
    messagePreview: string;
    organizationId?: string;
    conversationId?: string;
  };

  constructor(
    message: string,
    organizationId?: string,
    conversationId?: string,
  ) {
    this.startTime = performance.now();
    this.contextInfo = {
      messagePreview:
        message.length > 60 ? `${message.slice(0, 57)}...` : message,
      organizationId,
      conversationId,
    };

    console.log("\n" + "=".repeat(68));
    console.log(`[DentAssist Latency] 🚀 Receptionist Request Started`);
    console.log(
      `[DentAssist Latency] 💬 Prompt: "${this.contextInfo.messagePreview}"`,
    );
    if (organizationId) {
      console.log(
        `[DentAssist Latency] 🏢 Org: ${organizationId} | Convo: ${conversationId || "new"}`,
      );
    }
    console.log("-".repeat(68));
  }

  public startStage(name: string): void {
    this.activeStages.set(name, performance.now());
  }

  public endStage(name: string, details?: Record<string, unknown>): number {
    const started = this.activeStages.get(name);
    const now = performance.now();
    const duration =
      started !== undefined ? Number((now - started).toFixed(1)) : 0;
    this.activeStages.delete(name);

    this.stages.push({
      name,
      durationMs: duration,
      details,
    });

    const detailStr = details
      ? ` (${Object.entries(details)
          .map(([k, v]) => `${k}: ${String(v)}`)
          .join(", ")})`
      : "";

    console.log(
      `[DentAssist Latency] ⏱️  ${name.padEnd(32)}: ${duration.toFixed(1).padStart(7)} ms${detailStr}`,
    );

    return duration;
  }

  public async measure<T>(
    name: string,
    fn: () => Promise<T>,
    details?: Record<string, unknown>,
  ): Promise<T> {
    this.startStage(name);
    try {
      const result = await fn();
      this.endStage(name, details);
      return result;
    } catch (err) {
      this.endStage(name, { ...(details || {}), error: String(err) });
      throw err;
    }
  }

  public printSummary(): void {
    const totalDuration = Number(
      (performance.now() - this.startTime).toFixed(1),
    );
    const totalSeconds = (totalDuration / 1000).toFixed(2);

    console.log("-".repeat(68));
    console.log(`[DentAssist Latency] 📊 EXECUTION BREAKDOWN SUMMARY`);
    for (let i = 0; i < this.stages.length; i++) {
      const stage = this.stages[i];
      const percent =
        totalDuration > 0
          ? ((stage.durationMs / totalDuration) * 100).toFixed(1)
          : "0.0";
      const detailStr = stage.details
        ? ` [${Object.entries(stage.details)
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join(", ")}]`
        : "";
      console.log(
        `[DentAssist Latency]   ${String(i + 1).padStart(2, "0")}. ${stage.name.padEnd(30)}: ${stage.durationMs
          .toFixed(1)
          .padStart(8)} ms (${percent.padStart(4)}%)${detailStr}`,
      );
    }
    console.log("-".repeat(68));
    console.log(
      `[DentAssist Latency] 🏁 TOTAL TIME: ${totalDuration.toFixed(1)} ms (${totalSeconds}s)`,
    );
    console.log("=".repeat(68) + "\n");
  }

  public getTotalDurationMs(): number {
    return Number((performance.now() - this.startTime).toFixed(1));
  }

  public getStages(): LatencyStage[] {
    return [...this.stages];
  }

  public getTelemetry(counts?: {
    llmCalls?: number;
    toolCalls?: number;
    ragCalls?: number;
    promptGuardCalls?: number;
    dbCalls?: number;
    provider?: string;
    model?: string;
  }): ReceptionistTelemetry {
    const latencies: Record<string, number> = {};
    for (const stage of this.stages) {
      latencies[stage.name] = stage.durationMs;
    }

    return {
      totalLatencyMs: this.getTotalDurationMs(),
      promptGuardLatencyMs: latencies["Prompt Guard Security Check"] || 0,
      conversationLatencyMs: latencies["DB Get/Create Conversation"] || 0,
      userMessageSaveLatencyMs: latencies["DB Save User Message"] || 0,
      clinicInfoLatencyMs:
        latencies["Clinic Info Lookup"] ||
        latencies["Tool [getClinicInfo]"] ||
        0,
      intentExtractionLatencyMs: latencies["Intent & Entity Extraction"] || 0,
      serviceResolutionLatencyMs: latencies["Service Resolution"] || 0,
      availabilityLatencyMs: latencies["Tool [checkAvailability]"] || 0,
      bookingLatencyMs:
        latencies["Final Availability Check & Booking"] ||
        latencies["Tool [bookAppointment]"] ||
        0,
      ragLatencyMs: latencies["Tool [searchKnowledge]"] || 0,
      responseGenerationLatencyMs: latencies["Response Generation"] || 0,
      assistantSaveLatencyMs: latencies["DB Save Assistant Response"] || 0,
      llmCalls: counts?.llmCalls ?? 0,
      toolCalls: counts?.toolCalls ?? 0,
      ragCalls: counts?.ragCalls ?? 0,
      promptGuardCalls: counts?.promptGuardCalls ?? 0,
      dbCalls: counts?.dbCalls ?? 0,
      provider: counts?.provider || env.AI_PROVIDER,
      model: counts?.model || env.AI_MODEL,
      latencies,
    };
  }
}
