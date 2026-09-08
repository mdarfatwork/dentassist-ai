import { router, organizationProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  createServiceSchema,
  updateServiceSchema,
  deleteServiceSchema,
} from "@/lib/validations/service";

export const serviceRouter = router({
  /**
   * Retrieves all services belonging to the active organization.
   */
  list: organizationProcedure.query(async ({ ctx }) => {
    return await ctx.db.service.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { name: "asc" },
    });
  }),

  /**
   * Creates a new service scoped to the active organization.
   */
  create: organizationProcedure
    .input(createServiceSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.service.create({
        data: {
          organizationId: ctx.organizationId,
          name: input.name,
          description: input.description,
          durationMinutes: input.durationMinutes,
        },
      });
    }),

  /**
   * Updates an existing service, strictly enforcing tenant boundary.
   */
  update: organizationProcedure
    .input(updateServiceSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.service.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service not found in this organization.",
        });
      }

      return await ctx.db.service.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
          durationMinutes: input.durationMinutes,
        },
      });
    }),

  /**
   * Deletes a service, strictly enforcing tenant boundary.
   */
  delete: organizationProcedure
    .input(deleteServiceSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.service.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service not found in this organization.",
        });
      }

      await ctx.db.service.delete({
        where: { id: input.id },
      });

      return { success: true, id: input.id };
    }),
});
