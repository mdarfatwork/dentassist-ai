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
import { AITraceCollector } from "./trace";

export type { ReceptionistStreamEvent };

export interface StreamReceptionistInput {
  organizationId: string;
  conversationId?: string;
  message: string;
  traceId?: string;
  turnId?: string;
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

  const traceCollector = new AITraceCollector({
    conversationId: input.conversationId || "new",
    organizationId,
    channel: "chat",
    traceId: input.traceId,
    turnId: input.turnId,
  });

  traceCollector.recordEvent({
    stage: "Request Received",
    status: "completed",
    metadata: { channel: "chat" },
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

    yield {
      type: "done",
      reply: greetingReply,
      bookingState: currentBookingState,
      toolCalls: [],
      conversationId: conversation.id,
      telemetry: profiler.getTelemetry({ promptGuardCalls: 0, dbCalls: 3 }),
      traceId: trace.id,
      turnId: trace.turnId,
      trace,
    };
    return;
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
    const refusal =
      "I cannot fulfill this request. As the clinic receptionist, I can only assist with verified dental practice inquiries, clinic information, and appointment scheduling.";

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

    yield {
      type: "done",
      reply: refusal,
      bookingState: {},
      toolCalls: [],
      conversationId: input.conversationId || "flagged",
      isSecurityFlagged: true,
      securityNotice: guardResult.reason || "Security policy violation.",
      telemetry: profiler.getTelemetry({ promptGuardCalls: 1, dbCalls: 0 }),
      traceId: trace.id,
      turnId: trace.turnId,
      trace,
    };
    profiler.printSummary();
    return;
  }

  traceCollector.recordEvent({
    stage: "Prompt Guard Security Check",
    status: "completed",
    durationMs: guardDuration,
    metadata: { isSafe: true },
  });

  // 3. Fetch or create conversation in database
  profiler.startStage("DB Get/Create Conversation");
  const convStart = performance.now();
  const conversation = await getOrCreateConversation(
    organizationId,
    input.conversationId,
  );
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
  const workflowResult = await ReceptionistWorkflowCoordinator.execute({
    organizationId,
    conversationId: conversation.id,
    message: trimmedMessage,
    bookingState: currentBookingState,
    historyMessages: conversation.messages,
    profiler,
    traceCollector,
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

    traceCollector.recordToolCall({
      id: tc.id,
      name: tc.name,
      input: tc.args,
      output: tc.result,
      error: tc.error,
      durationMs: tc.executionTimeMs,
    });

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
  const asstStart = performance.now();
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
  const asstDuration = Number((performance.now() - asstStart).toFixed(1));
  profiler.endStage("DB Save Assistant Response");

  traceCollector.recordEvent({
    stage: "DB Save Assistant Response",
    status: "completed",
    durationMs: asstDuration,
  });

  const uniqueSources = deduplicateSources(workflowResult.sources || []);
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

  yield {
    type: "done",
    reply: workflowResult.reply,
    bookingState: workflowResult.bookingState,
    toolCalls: workflowResult.toolCalls,
    sources: uniqueSources.length > 0 ? uniqueSources : undefined,
    conversationId: conversation.id,
    telemetry,
    traceId: trace.id,
    turnId: trace.turnId,
    trace,
  };
}
