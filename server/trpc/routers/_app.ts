import { router } from "../trpc";
import { authRouter } from "./auth";
import { organizationRouter } from "./organization";
import { dentistRouter } from "./dentist";
import { serviceRouter } from "./service";
import { workingHoursRouter } from "./working-hours";
import { holidayRouter } from "./holiday";
import { storageRouter } from "./storage";
import { knowledgeRouter } from "./knowledge";
import { receptionistRouter } from "./receptionist";
import { appointmentRouter } from "./appointment";

export const appRouter = router({
  auth: authRouter,
  organization: organizationRouter,
  dentist: dentistRouter,
  service: serviceRouter,
  workingHours: workingHoursRouter,
  holiday: holidayRouter,
  storage: storageRouter,
  knowledge: knowledgeRouter,
  receptionist: receptionistRouter,
  appointment: appointmentRouter,
});

export type AppRouter = typeof appRouter;
