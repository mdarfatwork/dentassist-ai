import { router, organizationProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { ReceptionistService } from "@/lib/receptionist/service";
import { db } from "@/lib/db";

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
   * Dispatches a user message to the AI Receptionist engine and returns response with telemetry.
   */
  sendMessage: organizationProcedure
    .input(
      z.object({
        conversationId: z.string().optional(),
        message: z.string().min(1, "Message cannot be empty"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const response = await ReceptionistService.processMessage({
        organizationId: ctx.organizationId,
        conversationId: input.conversationId,
        message: input.message,
      });

      return response;
    }),
});
