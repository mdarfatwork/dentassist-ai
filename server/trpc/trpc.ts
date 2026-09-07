import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { type Context } from "./context";
import { getActiveOrganization } from "@/lib/auth/organization";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const createCallerFactory = t.createCallerFactory;
export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to access this resource.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
    },
  });
});

export const organizationProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    const activeOrg = await getActiveOrganization(
      ctx.user.id,
      ctx.activeOrgCookie,
    );

    if (!activeOrg) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "No active organization found. Please create an organization first.",
      });
    }

    return next({
      ctx: {
        ...ctx,
        organization: activeOrg,
        organizationId: activeOrg.id,
        role: activeOrg.role,
      },
    });
  },
);
