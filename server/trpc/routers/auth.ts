import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";

export const authRouter = router({
  getSession: publicProcedure.query(async ({ ctx }) => {
    return {
      session: ctx.session,
      user: ctx.user,
    };
  }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        createdAt: true,
      },
    });

    return user;
  }),

  checkEmailAvailable: publicProcedure
    .input(
      z.object({
        email: z.email(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const existing = await ctx.db.user.findUnique({
        where: { email: input.email.toLowerCase().trim() },
        select: { id: true },
      });

      return {
        available: !existing,
      };
    }),
});
