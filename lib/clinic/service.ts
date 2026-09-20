import { db } from "@/lib/db";
import {
  DAYS_OF_WEEK,
  DEFAULT_WORKING_HOURS,
} from "@/lib/validations/working-hours";

export interface ClinicInfoResult {
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  timezone: string;
}

export interface DayScheduleSummary {
  day: string;
  isOpen: boolean;
  hours: string; // e.g. "09:00 - 17:00" or "Closed"
}

export interface ClinicHoursResult {
  timezone: string;
  weeklySchedule: DayScheduleSummary[];
  upcomingHolidays: Array<{
    name: string;
    date: string; // YYYY-MM-DD
  }>;
}

export interface ClinicServiceItem {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
}

export interface ClinicDentistItem {
  id: string;
  name: string;
  specialization: string | null;
}

/**
 * ClinicService
 * Encapsulates structured data access for clinic metadata, operating hours,
 * services, and practitioner rosters.
 */
export class ClinicService {
  /**
   * Retrieves sanitized clinic identity and contact information.
   */
  public static async getClinicInfo(
    organizationId: string,
  ): Promise<ClinicInfoResult | null> {
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        description: true,
        phone: true,
        email: true,
        address: true,
        timezone: true,
      },
    });

    return org;
  }

  /**
   * Retrieves structured working hours and closure calendar.
   */
  public static async getClinicHours(
    organizationId: string,
  ): Promise<ClinicHoursResult> {
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { timezone: true },
    });
    const timezone = org?.timezone || "UTC";

    const [workingHours, holidays] = await Promise.all([
      db.workingHours.findMany({
        where: { organizationId },
      }),
      db.holiday.findMany({
        where: {
          organizationId,
          date: { gte: new Date() },
        },
        orderBy: { date: "asc" },
        take: 10,
      }),
    ]);

    const hoursMap = new Map(workingHours.map((wh) => [wh.dayOfWeek, wh]));

    const weeklySchedule: DayScheduleSummary[] = DAYS_OF_WEEK.map((day) => {
      const entry = hoursMap.get(day);
      if (entry) {
        return {
          day,
          isOpen: entry.isOpen,
          hours:
            entry.isOpen && entry.startTime && entry.endTime
              ? `${entry.startTime} - ${entry.endTime}`
              : "Closed",
        };
      }

      const defaultEntry = DEFAULT_WORKING_HOURS.find(
        (d) => d.dayOfWeek === day,
      );
      if (defaultEntry) {
        return {
          day,
          isOpen: defaultEntry.isOpen,
          hours:
            defaultEntry.isOpen &&
            defaultEntry.startTime &&
            defaultEntry.endTime
              ? `${defaultEntry.startTime} - ${defaultEntry.endTime}`
              : "Closed",
        };
      }

      return { day, isOpen: false, hours: "Closed" };
    });

    return {
      timezone,
      weeklySchedule,
      upcomingHolidays: holidays.map((h) => ({
        name: h.name,
        date: h.date.toISOString().split("T")[0],
      })),
    };
  }

  /**
   * Lists all active dental services offered by the clinic.
   */
  public static async listServices(
    organizationId: string,
  ): Promise<ClinicServiceItem[]> {
    return await db.service.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
      },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Lists dental practitioners registered with the clinic.
   */
  public static async listDentists(
    organizationId: string,
  ): Promise<ClinicDentistItem[]> {
    return await db.dentist.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        specialization: true,
      },
      orderBy: { name: "asc" },
    });
  }
}
