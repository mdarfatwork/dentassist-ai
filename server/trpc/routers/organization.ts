import { router, protectedProcedure, organizationProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  createOrganizationSchema,
  switchOrganizationSchema,
  getOrganizationSchema,
} from "@/lib/validations/organization";
import { updateClinicProfileSchema } from "@/lib/validations/clinic";
import {
  getUserOrganizations,
  getActiveOrganization,
  requireOrganizationMembership,
  createOrganizationWithMembership,
} from "@/lib/auth/organization";

export const organizationRouter = router({
  /**
   * Retrieves all organizations where the authenticated user is a member.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return await getUserOrganizations(ctx.user.id);
  }),

  /**
   * Retrieves the currently active organization for the authenticated user.
   * Resolves based on cookie preference, verified against membership, or falls back to first org.
   */
  getActive: protectedProcedure.query(async ({ ctx }) => {
    return await getActiveOrganization(ctx.user.id, ctx.activeOrgCookie);
  }),

  /**
   * Retrieves a specific organization by ID, strictly verifying membership.
   */
  get: protectedProcedure
    .input(getOrganizationSchema)
    .query(async ({ ctx, input }) => {
      const { organization, role } = await requireOrganizationMembership(
        ctx.user.id,
        input.organizationId,
      );

      return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        description: organization.description,
        logoUrl: organization.logoUrl,
        phone: organization.phone,
        email: organization.email,
        address: organization.address,
        timezone: organization.timezone,
        role,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
      };
    }),

  /**
   * Updates clinic profile information for the active organization.
   */
  updateProfile: organizationProcedure
    .input(updateClinicProfileSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate role permissions (OWNER or ADMIN)
      if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Only organization owners and admins can update clinic profile settings.",
        });
      }

      const updated = await ctx.db.organization.update({
        where: { id: ctx.organizationId },
        data: {
          name: input.name,
          description: input.description,
          logoUrl: input.logoUrl,
          phone: input.phone,
          email: input.email,
          address: input.address,
          timezone: input.timezone,
        },
      });

      return {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        description: updated.description,
        logoUrl: updated.logoUrl,
        phone: updated.phone,
        email: updated.email,
        address: updated.address,
        timezone: updated.timezone,
        role: ctx.role,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    }),

  /**
   * Atomically creates a new organization and assigns the authenticated user as OWNER.
   */
  create: protectedProcedure
    .input(createOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      const org = await createOrganizationWithMembership(ctx.user.id, {
        name: input.name,
      });

      return org;
    }),

  /**
   * Switches active organization context by verifying membership.
   */
  setActive: protectedProcedure
    .input(switchOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      const { organization, role } = await requireOrganizationMembership(
        ctx.user.id,
        input.organizationId,
      );

      return {
        success: true,
        organizationId: organization.id,
        name: organization.name,
        slug: organization.slug,
        role,
      };
    }),
});
