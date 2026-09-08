import { router } from "../trpc";
import { authRouter } from "./auth";
import { organizationRouter } from "./organization";
import { dentistRouter } from "./dentist";
import { serviceRouter } from "./service";
import { workingHoursRouter } from "./working-hours";
import { holidayRouter } from "./holiday";

export const appRouter = router({
  auth: authRouter,
  organization: organizationRouter,
  dentist: dentistRouter,
  service: serviceRouter,
  workingHours: workingHoursRouter,
  holiday: holidayRouter,
});

export type AppRouter = typeof appRouter;
