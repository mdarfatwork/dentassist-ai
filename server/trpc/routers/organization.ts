import { router, protectedProcedure } from "../trpc";
import {
  createOrganizationSchema,
  switchOrganizationSchema,
  getOrganizationSchema,
} from "@/lib/validations/organization";
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
        role,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
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
