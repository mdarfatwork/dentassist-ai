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

export interface ProcessMessageInput {
  organizationId: string;
  conversationId?: string;
  message: string;
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

      return {
        reply: greetingReply,
        bookingState: currentBookingState,
        toolCalls: [],
        telemetry: profiler.getTelemetry({ promptGuardCalls: 0, dbCalls: 3 }),
      };
    }

    // 2. Prompt Guard Security Layer
    profiler.startStage("Prompt Guard Security Check");
    const guardResult = await PromptGuardService.checkPrompt(trimmedMessage);
    profiler.endStage("Prompt Guard Security Check", {
      isSafe: guardResult.isSafe,
    });

    if (!guardResult.isSafe) {
      profiler.printSummary();
      return {
        reply:
          "I cannot fulfill this request. As the clinic receptionist, I can only assist with verified dental practice inquiries, clinic information, and appointment scheduling.",
        bookingState: {},
        toolCalls: [],
        isSecurityFlagged: true,
        securityNotice: guardResult.reason || "Security policy violation.",
        telemetry: profiler.getTelemetry({ promptGuardCalls: 1, dbCalls: 0 }),
      };
    }

    // 3. Fetch or create conversation
    profiler.startStage("DB Get/Create Conversation");
    const conversation = await this.getOrCreateConversation(
      organizationId,
      input.conversationId,
    );
    profiler.endStage("DB Get/Create Conversation");

    // 4. Persist incoming user message
    profiler.startStage("DB Save User Message");
    await db.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: trimmedMessage,
      },
    });
    profiler.endStage("DB Save User Message");

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
    }

    // 7. Persist assistant response & updated booking state
    profiler.startStage("DB Save Assistant Response");
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
    profiler.endStage("DB Save Assistant Response");

    const uniqueSources = this.deduplicateSources(workflowResult.sources || []);

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

    return {
      reply: workflowResult.reply,
      bookingState: workflowResult.bookingState,
      toolCalls: workflowResult.toolCalls,
      sources: uniqueSources.length > 0 ? uniqueSources : undefined,
      telemetry,
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
