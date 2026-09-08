import { router, organizationProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  createDentistSchema,
  updateDentistSchema,
  deleteDentistSchema,
} from "@/lib/validations/dentist";

export const dentistRouter = router({
  /**
   * Retrieves all dentists belonging to the active organization.
   */
  list: organizationProcedure.query(async ({ ctx }) => {
    return await ctx.db.dentist.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { name: "asc" },
    });
  }),

  /**
   * Creates a new dentist scoped to the active organization.
   */
  create: organizationProcedure
    .input(createDentistSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.dentist.create({
        data: {
          organizationId: ctx.organizationId,
          name: input.name,
          specialization: input.specialization,
        },
      });
    }),

  /**
   * Updates an existing dentist, strictly enforcing tenant boundary.
   */
  update: organizationProcedure
    .input(updateDentistSchema)
    .mutation(async ({ ctx, input }) => {
      // Strictly verify dentist belongs to active organization to prevent cross-tenant modification
      const existing = await ctx.db.dentist.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dentist not found in this organization.",
        });
      }

      return await ctx.db.dentist.update({
        where: { id: input.id },
        data: {
          name: input.name,
          specialization: input.specialization,
        },
      });
    }),

  /**
   * Deletes a dentist, strictly enforcing tenant boundary.
   */
  delete: organizationProcedure
    .input(deleteDentistSchema)
    .mutation(async ({ ctx, input }) => {
      // Strictly verify dentist belongs to active organization
      const existing = await ctx.db.dentist.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dentist not found in this organization.",
        });
      }

      await ctx.db.dentist.delete({
        where: { id: input.id },
      });

      return { success: true, id: input.id };
    }),
});
