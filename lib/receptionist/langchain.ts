import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { PromptGuardService } from "@/lib/knowledge/prompt-guard";
import { ClinicService } from "@/lib/clinic/service";
import {
  type BookingState,
  type SourceCitation,
  type ReceptionistStreamEvent,
} from "./types";
import { isPureGreeting, getClinicGreetingResponse } from "./greetings";
import { ReceptionistProfiler } from "./profiler";
import { ReceptionistWorkflowCoordinator } from "./workflow";

export type { ReceptionistStreamEvent };

export interface StreamReceptionistInput {
  organizationId: string;
  conversationId?: string;
  message: string;
}

async function getOrCreateConversation(
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

function deduplicateSources(
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

/**
 * Main streaming generator for the AI Receptionist.
 * Seamlessly integrates the deterministic workflow coordinator with SSE event streaming.
 */
export async function* streamReceptionistResponse(
  input: StreamReceptionistInput,
): AsyncGenerator<ReceptionistStreamEvent> {
  const { organizationId, message } = input;
  const trimmedMessage = message.trim();

  const profiler = new ReceptionistProfiler(
    trimmedMessage,
    organizationId,
    input.conversationId,
  );

  // 1. Instant Fast-Path for Pure Greetings (<50ms)
  if (isPureGreeting(trimmedMessage)) {
    profiler.startStage("Fast-Path Greeting Response");

    const clinic = await ClinicService.getClinicInfo(organizationId);
    const clinicName = clinic?.name || "the clinic";
    const conversation = await getOrCreateConversation(
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

    // Stream friendly greeting tokens
    const words = greetingReply.split(" ");
    for (let i = 0; i < words.length; i++) {
      yield { type: "token", delta: (i === 0 ? "" : " ") + words[i] };
    }

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

    yield {
      type: "done",
      reply: greetingReply,
      bookingState: currentBookingState,
      toolCalls: [],
      conversationId: conversation.id,
      telemetry: profiler.getTelemetry({ promptGuardCalls: 0, dbCalls: 3 }),
    };
    return;
  }

  // 2. Prompt Guard Security Layer
  profiler.startStage("Prompt Guard Security Check");
  const guardResult = await PromptGuardService.checkPrompt(trimmedMessage);
  profiler.endStage("Prompt Guard Security Check", {
    isSafe: guardResult.isSafe,
  });

  if (!guardResult.isSafe) {
    const refusal =
      "I cannot fulfill this request. As the clinic receptionist, I can only assist with verified dental practice inquiries, clinic information, and appointment scheduling.";

    yield {
      type: "done",
      reply: refusal,
      bookingState: {},
      toolCalls: [],
      conversationId: input.conversationId || "flagged",
      isSecurityFlagged: true,
      securityNotice: guardResult.reason || "Security policy violation.",
      telemetry: profiler.getTelemetry({ promptGuardCalls: 1, dbCalls: 0 }),
    };
    profiler.printSummary();
    return;
  }

  // 3. Fetch or create conversation in database
  profiler.startStage("DB Get/Create Conversation");
  const conversation = await getOrCreateConversation(
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
  const workflowResult = await ReceptionistWorkflowCoordinator.execute({
    organizationId,
    conversationId: conversation.id,
    message: trimmedMessage,
    bookingState: currentBookingState,
    historyMessages: conversation.messages,
    profiler,
  });

  // 6. Emit tool events and persist tool messages
  for (const tc of workflowResult.toolCalls) {
    if (tc.name === "searchKnowledge") {
      yield { type: "stage", stage: "searching_knowledge" };
    } else if (tc.name === "checkAvailability") {
      yield { type: "stage", stage: "checking_availability" };
    } else if (tc.name === "bookAppointment") {
      yield { type: "stage", stage: "checking_calendar" };
    }

    yield { type: "tool_start", toolName: tc.name, toolCallId: tc.id };
    yield {
      type: "tool_end",
      toolName: tc.name,
      executionTimeMs: tc.executionTimeMs || 10,
      result: tc.result,
    };

    await db.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: "TOOL",
        content:
          typeof tc.result === "string" ? tc.result : JSON.stringify(tc.result),
        toolName: tc.name,
        toolCallId: tc.id,
        toolArgs: tc.args as unknown as Prisma.InputJsonValue,
        toolResult: tc.result as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // 7. Stream final reply tokens
  const replyWords = workflowResult.reply.split(" ");
  for (let i = 0; i < replyWords.length; i++) {
    yield { type: "token", delta: (i === 0 ? "" : " ") + replyWords[i] };
  }

  // 8. Persist assistant final response and updated booking state
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

  const uniqueSources = deduplicateSources(workflowResult.sources || []);

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

  yield {
    type: "done",
    reply: workflowResult.reply,
    bookingState: workflowResult.bookingState,
    toolCalls: workflowResult.toolCalls,
    sources: uniqueSources.length > 0 ? uniqueSources : undefined,
    conversationId: conversation.id,
    telemetry,
  };
}
