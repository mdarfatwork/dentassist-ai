import { router, organizationProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { ReceptionistService } from "@/lib/receptionist/service";
import { voiceTurnInputSchema } from "@/lib/voice/voice-turn.schema";
import { db } from "@/lib/db";
import { TraceStore } from "@/lib/receptionist/trace";

export const receptionistRouter = router({
  /**
   * Creates a new conversation thread for the active organization.
   */
  createConversation: organizationProcedure.mutation(async ({ ctx }) => {
    const prisma = ctx.db.conversation ? ctx.db : db;
    const conversation = await prisma.conversation.create({
      data: {
        organizationId: ctx.organizationId,
        bookingState: {},
      },
      select: {
        id: true,
        organizationId: true,
        createdAt: true,
      },
    });

    return conversation;
  }),

  /**
   * Retrieves conversation history and structured booking state.
   */
  getConversation: organizationProcedure
    .input(
      z.object({
        conversationId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const prisma = ctx.db.conversation ? ctx.db : db;
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: input.conversationId,
          organizationId: ctx.organizationId, // Strict tenant boundary
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            where: {
              // Only expose USER and ASSISTANT messages to client view; TOOL messages can be fetched for debug
              role: { in: ["USER", "ASSISTANT"] },
            },
          },
        },
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found in this organization.",
        });
      }

      return {
        id: conversation.id,
        bookingState: conversation.bookingState,
        messages: conversation.messages.map((m) => ({
          id: m.id,
          role: m.role.toLowerCase() as "user" | "assistant",
          content: m.content,
          createdAt: m.createdAt,
        })),
        createdAt: conversation.createdAt,
      };
    }),

  /**
   * Lists recent conversations for the active organization.
   */
  listConversations: organizationProcedure.query(async ({ ctx }) => {
    const prisma = ctx.db.conversation ? ctx.db : db;
    return await prisma.conversation.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
  }),

  /**
   * Dispatches a user message to the AI Receptionist engine and returns response with telemetry and trace.
   */
  sendMessage: organizationProcedure
    .input(
      z.object({
        conversationId: z.string().optional(),
        message: z.string().min(1, "Message cannot be empty"),
        channel: z.enum(["chat", "voice"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const response = await ReceptionistService.processMessage({
        organizationId: ctx.organizationId,
        conversationId: input.conversationId,
        message: input.message,
        channel: input.channel || "chat",
      });

      return response;
    }),

  /**
   * Processes a spoken patient utterance for the active organization.
   * Completely reuses the existing AI Core, tools, scheduling, and RAG pipelines.
   */
  voiceTurn: organizationProcedure
    .input(voiceTurnInputSchema)
    .mutation(async ({ ctx, input }) => {
      const response = await ReceptionistService.processMessage({
        organizationId: ctx.organizationId,
        conversationId: input.conversationId,
        message: input.transcript,
        channel: "voice",
      });

      return {
        conversationId: response.conversationId ?? input.conversationId ?? "",
        responseText: response.reply,
        bookingState: response.bookingState,
        toolCalls: response.toolCalls,
        sources: response.sources,
        telemetry: response.telemetry,
        isSecurityFlagged: response.isSecurityFlagged,
        securityNotice: response.securityNotice,
        traceId: response.traceId,
        turnId: response.turnId,
        trace: response.trace,
      };
    }),

  /**
   * Retrieves a detailed execution trace for a single turn.
   * Strictly enforces organization scoping and authentication.
   */
  getTrace: organizationProcedure
    .input(
      z.object({
        traceId: z.string().min(1, "Trace ID is required"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const trace = TraceStore.getTrace(ctx.organizationId, input.traceId);
      if (!trace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "Trace not found or not accessible within this organization.",
        });
      }
      return trace;
    }),

  /**
   * Retrieves a turn trace by turnId and conversationId within the active organization.
   */
  getTurnTrace: organizationProcedure
    .input(
      z.object({
        conversationId: z.string().min(1),
        turnId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const prisma = ctx.db.conversation ? ctx.db : db;
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: input.conversationId,
          organizationId: ctx.organizationId,
        },
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found in this organization.",
        });
      }

      const trace = TraceStore.getTurnTrace(
        ctx.organizationId,
        input.conversationId,
        input.turnId,
      );

      if (!trace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Turn trace not found or expired.",
        });
      }

      return trace;
    }),

  /**
   * Lists all turn traces associated with a conversation in the active organization.
   */
  getConversationTraces: organizationProcedure
    .input(
      z.object({
        conversationId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const prisma = ctx.db.conversation ? ctx.db : db;
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: input.conversationId,
          organizationId: ctx.organizationId,
        },
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found in this organization.",
        });
      }

      return TraceStore.listConversationTraces(
        ctx.organizationId,
        input.conversationId,
      );
    }),

  /**
   * Resets/clears a conversation's messages and booking state for test resets.
   */
  clearConversation: organizationProcedure
    .input(
      z.object({
        conversationId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const prisma = ctx.db.conversation ? ctx.db : db;
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: input.conversationId,
          organizationId: ctx.organizationId,
        },
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found in this organization.",
        });
      }

      await prisma.conversationMessage.deleteMany({
        where: { conversationId: input.conversationId },
      });

      await prisma.conversation.update({
        where: { id: input.conversationId },
        data: { bookingState: {} },
      });

      TraceStore.clearConversationTraces(
        ctx.organizationId,
        input.conversationId,
      );

      return { success: true };
    }),
});
