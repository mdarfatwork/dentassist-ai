import { router } from "../trpc";
import { authRouter } from "./auth";
import { organizationRouter } from "./organization";

export const appRouter = router({
  auth: authRouter,
  organization: organizationRouter,
});

export type AppRouter = typeof appRouter;
