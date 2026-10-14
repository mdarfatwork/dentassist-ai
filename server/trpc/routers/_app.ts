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
import { googleCalendarRouter } from "./google-calendar";
import { availabilityRouter } from "./availability";
import { widgetRouter } from "./widget";

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
  googleCalendar: googleCalendarRouter,
  availability: availabilityRouter,
  widget: widgetRouter,
});

export type AppRouter = typeof appRouter;
