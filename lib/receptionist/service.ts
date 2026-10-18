import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { PromptGuardService } from "@/lib/knowledge/prompt-guard";
import { ClinicService } from "@/lib/clinic/service";
import {
  type BookingState,
  type ReceptionistResponse,
  type SourceCitation,
} from "./types";
import { isPureGreeting, getClinicGreetingResponse } from "./greetings";
import { ReceptionistProfiler } from "./profiler";
import { ReceptionistWorkflowCoordinator } from "./workflow";
import { AITraceCollector } from "./trace";

export interface ProcessMessageInput {
  organizationId: string;
  conversationId?: string;
  message: string;
  channel?: "chat" | "voice";
  traceId?: string;
  turnId?: string;
}

/**
 * ReceptionistService
 * Coordinates the deterministic workflow, fast-path greetings, Prompt Guard security verification,
 * structured state extraction, and conversation persistence.
 */
export class ReceptionistService {
  /**
   * Main entrypoint for processing a patient/staff message.
   */
  public static async processMessage(
    input: ProcessMessageInput,
  ): Promise<ReceptionistResponse> {
    const { organizationId, message } = input;
    const trimmedMessage = message.trim();

    const traceCollector = new AITraceCollector({
      conversationId: input.conversationId || "new",
      organizationId,
      channel: input.channel || "chat",
      traceId: input.traceId,
      turnId: input.turnId,
    });

    traceCollector.recordEvent({
      stage: "Request Received",
      status: "completed",
      metadata: { channel: input.channel || "chat" },
    });

    traceCollector.recordEvent({
      stage: "Input Validation",
      status: "completed",
      metadata: { messageLength: trimmedMessage.length },
    });

    const profiler = new ReceptionistProfiler(
      trimmedMessage,
      organizationId,
      input.conversationId,
    );

    // 1. Instant Fast-Path for Pure Greetings (<50ms)
    // Bypasses heavy LLM reasoning and remote Prompt Guard classification.
    if (isPureGreeting(trimmedMessage)) {
      profiler.startStage("Fast-Path Greeting Response");

      const clinic = await ClinicService.getClinicInfo(organizationId);
      const clinicName = clinic?.name || "the clinic";
      const conversation = await this.getOrCreateConversation(
        organizationId,
        input.conversationId,
      );
      traceCollector.setConversationId(conversation.id);

      await db.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          role: "USER",
          content: trimmedMessage,
        },
      });

      const greetingReply = getClinicGreetingResponse(clinicName);

      await db.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          role: "ASSISTANT",
          content: greetingReply,
        },
      });

      const currentBookingState: BookingState =
        (conversation.bookingState as BookingState) || {};

      profiler.endStage("Fast-Path Greeting Response", { clinicName });
      profiler.printSummary();

      traceCollector.recordEvent({
        stage: "Fast-Path Greeting Response",
        status: "completed",
        metadata: { clinicName },
      });
      traceCollector.setIntentAndEntities({
        intent: "GENERAL_GREETING",
        provider: "deterministic",
        model: "greeting-fastpath",
      });

      const trace = traceCollector.complete("success");

      return {
        conversationId: conversation.id,
        reply: greetingReply,
        bookingState: currentBookingState,
        toolCalls: [],
        telemetry: profiler.getTelemetry({ promptGuardCalls: 0, dbCalls: 3 }),
        traceId: trace.id,
        turnId: trace.turnId,
        trace,
      };
    }

    // 2. Prompt Guard Security Layer
    profiler.startStage("Prompt Guard Security Check");
    const guardStart = performance.now();
    const guardResult = await PromptGuardService.checkPrompt(trimmedMessage);
    const guardDuration = Number((performance.now() - guardStart).toFixed(1));
    profiler.endStage("Prompt Guard Security Check", {
      isSafe: guardResult.isSafe,
    });

    if (!guardResult.isSafe) {
      profiler.printSummary();

      traceCollector.recordEvent({
        stage: "Prompt Guard Security Check",
        status: "blocked",
        durationMs: guardDuration,
        metadata: { isSafe: false, reason: guardResult.reason },
      });
      traceCollector.setIntentAndEntities({
        intent: "PROMPT_GUARD_BLOCKED",
      });
      traceCollector.recordError({
        stage: "Prompt Guard Security Check",
        code: "PROMPT_GUARD_VIOLATION",
        message: guardResult.reason || "Security policy violation.",
      });

      const trace = traceCollector.complete("blocked");

      return {
        conversationId: input.conversationId,
        reply:
          "I cannot fulfill this request. As the clinic receptionist, I can only assist with verified dental practice inquiries, clinic information, and appointment scheduling.",
        bookingState: {},
        toolCalls: [],
        isSecurityFlagged: true,
        securityNotice: guardResult.reason || "Security policy violation.",
        telemetry: profiler.getTelemetry({ promptGuardCalls: 1, dbCalls: 0 }),
        traceId: trace.id,
        turnId: trace.turnId,
        trace,
      };
    }

    traceCollector.recordEvent({
      stage: "Prompt Guard Security Check",
      status: "completed",
      durationMs: guardDuration,
      metadata: { isSafe: true },
    });

    // 3. Fetch or create conversation
    profiler.startStage("DB Get/Create Conversation");
    const convStart = performance.now();
    const conversation = await this.getOrCreateConversation(
      organizationId,
      input.conversationId,
    );
    traceCollector.setConversationId(conversation.id);
    const convDuration = Number((performance.now() - convStart).toFixed(1));
    profiler.endStage("DB Get/Create Conversation");

    traceCollector.recordEvent({
      stage: "DB Get/Create Conversation",
      status: "completed",
      durationMs: convDuration,
      metadata: { conversationId: conversation.id },
    });

    // 4. Persist incoming user message
    profiler.startStage("DB Save User Message");
    const userSaveStart = performance.now();
    await db.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: trimmedMessage,
      },
    });
    const userSaveDuration = Number(
      (performance.now() - userSaveStart).toFixed(1),
    );
    profiler.endStage("DB Save User Message");

    traceCollector.recordEvent({
      stage: "DB Save User Message",
      status: "completed",
      durationMs: userSaveDuration,
    });

    const currentBookingState: BookingState =
      (conversation.bookingState as BookingState) || {};

    // 5. Execute Deterministic Workflow Coordinator
    // Runs single-turn extraction, deterministic service/date resolution, and factual generation.
    const workflowResult = await ReceptionistWorkflowCoordinator.execute({
      organizationId,
      conversationId: conversation.id,
      message: trimmedMessage,
      bookingState: currentBookingState,
      historyMessages: conversation.messages,
      profiler,
      traceCollector,
    });

    // 6. Persist any executed tool calls into conversation history
    if (workflowResult.toolCalls.length > 0) {
      profiler.startStage("DB Save Tool Messages");
      for (const tc of workflowResult.toolCalls) {
        await db.conversationMessage.create({
          data: {
            conversationId: conversation.id,
            role: "TOOL",
            content:
              typeof tc.result === "string"
                ? tc.result
                : JSON.stringify(tc.result),
            toolName: tc.name,
            toolCallId: tc.id,
            toolArgs: tc.args as unknown as Prisma.InputJsonValue,
            toolResult: tc.result as unknown as Prisma.InputJsonValue,
          },
        });
      }
      profiler.endStage("DB Save Tool Messages", {
        count: workflowResult.toolCalls.length,
      });

      for (const tc of workflowResult.toolCalls) {
        traceCollector.recordToolCall({
          id: tc.id,
          name: tc.name,
          input: tc.args,
          output: tc.result,
          error: tc.error,
          durationMs: tc.executionTimeMs,
        });
      }
    }

    // 7. Persist assistant response & updated booking state
    profiler.startStage("DB Save Assistant Response");
    const asstSaveStart = performance.now();
    await db.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: workflowResult.reply,
      },
    });

    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        bookingState:
          workflowResult.bookingState as unknown as Prisma.InputJsonValue,
      },
    });
    const asstSaveDuration = Number(
      (performance.now() - asstSaveStart).toFixed(1),
    );
    profiler.endStage("DB Save Assistant Response");

    traceCollector.recordEvent({
      stage: "DB Save Assistant Response",
      status: "completed",
      durationMs: asstSaveDuration,
    });

    const uniqueSources = this.deduplicateSources(workflowResult.sources || []);
    if (uniqueSources.length > 0) {
      traceCollector.recordSources(
        uniqueSources.map((s) => ({
          documentId: s.documentId,
          documentName: s.documentName,
          headingPath: s.headingPath,
          pageNumber: s.pageNumber,
        })),
      );
    }

    profiler.printSummary();

    const stages = profiler.getStages().map((s) => s.name);
    const llmCalls =
      (stages.includes("Intent & Entity Extraction") ? 1 : 0) +
      (stages.includes("Response Generation") ? 1 : 0);

    const telemetry = profiler.getTelemetry({
      llmCalls,
      toolCalls: workflowResult.toolCalls.length,
      ragCalls: workflowResult.toolCalls.filter(
        (t) => t.name === "searchKnowledge",
      ).length,
      promptGuardCalls: 1,
      dbCalls: 3 + workflowResult.toolCalls.length,
    });

    const trace = traceCollector.complete("success");

    return {
      conversationId: conversation.id,
      reply: workflowResult.reply,
      bookingState: workflowResult.bookingState,
      toolCalls: workflowResult.toolCalls,
      sources: uniqueSources.length > 0 ? uniqueSources : undefined,
      telemetry,
      traceId: trace.id,
      turnId: trace.turnId,
      trace,
    };
  }

  private static async getOrCreateConversation(
    organizationId: string,
    conversationId?: string,
  ) {
    if (conversationId) {
      const existing = await db.conversation.findFirst({
        where: { id: conversationId, organizationId },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 20,
          },
        },
      });
      if (existing) return existing;
    }

    return await db.conversation.create({
      data: {
        organizationId,
        bookingState: {},
      },
      include: {
        messages: true,
      },
    });
  }

  private static deduplicateSources(
    collectedSources: SourceCitation[],
  ): SourceCitation[] {
    const uniqueSources: SourceCitation[] = [];
    const seen = new Set<string>();
    for (const src of collectedSources) {
      const key = `${src.documentId}:${src.headingPath || ""}:${src.pageNumber || ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueSources.push(src);
      }
    }
    return uniqueSources;
  }
}
