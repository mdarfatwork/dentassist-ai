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

export interface ResolveServiceResult {
  matchType: "exact" | "alias" | "ambiguous" | "none";
  service?: ClinicServiceItem;
  candidates?: ClinicServiceItem[];
}

const DENTAL_SERVICE_ALIASES: Record<string, string[]> = {
  cleaning: [
    "cleaning",
    "dental cleaning",
    "teeth cleaning",
    "tooth cleaning",
    "prophylaxis",
    "dental prophylaxis",
    "oral prophylaxis",
    "scale and polish",
    "scaling",
    "hygiene",
    "deep cleaning",
  ],
  whitening: [
    "whitening",
    "teeth whitening",
    "tooth whitening",
    "dental whitening",
    "bleaching",
    "laser whitening",
  ],
  examination: [
    "examination",
    "exam",
    "dental exam",
    "dental examination",
    "checkup",
    "check up",
    "dental checkup",
    "routine checkup",
    "consultation",
    "new patient exam",
  ],
  filling: [
    "filling",
    "dental filling",
    "cavity filling",
    "cavity",
    "composite filling",
    "amalgam filling",
    "tooth filling",
  ],
  "root canal": [
    "root canal",
    "root canal treatment",
    "root canal therapy",
    "endodontic",
    "endodontics",
    "rct",
  ],
  extraction: [
    "extraction",
    "tooth extraction",
    "teeth extraction",
    "tooth removal",
    "pull tooth",
    "wisdom tooth extraction",
    "wisdom teeth",
  ],
  crown: [
    "crown",
    "dental crown",
    "tooth cap",
    "cap",
    "bridge",
    "dental bridge",
  ],
  implant: ["implant", "dental implant", "tooth implant"],
  orthodontics: [
    "braces",
    "orthodontic",
    "orthodontics",
    "invisalign",
    "clear aligners",
    "aligners",
  ],
  veneer: ["veneer", "veneers", "porcelain veneers"],
};

function normalizePhrase(phrase: string): string {
  return phrase
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * ClinicService
 * Encapsulates structured data access for clinic metadata, operating hours,
 * services, and practitioner rosters.
 */
export class ClinicService {
  /**
   * Deterministically resolves a user-requested service name to an official clinic service.
   * Uses normalization and alias tables against the organization's database records.
   * NEVER calls Pinecone RAG or an external LLM.
   */
  public static async resolveServiceByName(params: {
    organizationId: string;
    name: string;
  }): Promise<ResolveServiceResult> {
    const { organizationId, name } = params;
    const normalizedInput = normalizePhrase(name);
    if (!normalizedInput) {
      return { matchType: "none" };
    }

    // 1. Fetch organization's active services
    const services = await db.service.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
      },
    });

    if (services.length === 0) {
      return { matchType: "none" };
    }

    // 2. Exact match check
    for (const s of services) {
      const normalizedServiceName = normalizePhrase(s.name);
      if (normalizedServiceName === normalizedInput) {
        return { matchType: "exact", service: s };
      }
    }

    // 3. Substring / Word inclusion match
    const substringMatches = services.filter((s) => {
      const normS = normalizePhrase(s.name);
      return normS.includes(normalizedInput) || normalizedInput.includes(normS);
    });

    if (substringMatches.length === 1) {
      return { matchType: "exact", service: substringMatches[0] };
    }
    if (substringMatches.length > 1) {
      return { matchType: "ambiguous", candidates: substringMatches };
    }

    // 4. Canonical Alias resolution
    // Find canonical categories matching user input
    const matchedCategories = new Set<string>();
    for (const [canonical, aliases] of Object.entries(DENTAL_SERVICE_ALIASES)) {
      for (const alias of aliases) {
        if (
          normalizedInput === alias ||
          normalizedInput.includes(alias) ||
          alias.includes(normalizedInput)
        ) {
          matchedCategories.add(canonical);
          break;
        }
      }
    }

    if (matchedCategories.size > 0) {
      const aliasMatches = services.filter((s) => {
        const normS = normalizePhrase(s.name);
        for (const cat of matchedCategories) {
          const categoryAliases = DENTAL_SERVICE_ALIASES[cat] || [cat];
          for (const alias of categoryAliases) {
            if (normS.includes(alias) || alias.includes(normS)) {
              return true;
            }
          }
        }
        return false;
      });

      if (aliasMatches.length === 1) {
        return { matchType: "alias", service: aliasMatches[0] };
      }
      if (aliasMatches.length > 1) {
        return { matchType: "ambiguous", candidates: aliasMatches };
      }
    }

    return { matchType: "none" };
  }

  private static clinicInfoCache = new Map<
    string,
    { data: ClinicInfoResult | null; timestamp: number }
  >();
  private static readonly CLINIC_INFO_TTL_MS = 60 * 1000; // 60 seconds

  /**
   * Invalidates or clears the clinic info cache for one or all organizations.
   */
  public static clearClinicInfoCache(organizationId?: string): void {
    if (organizationId) {
      this.clinicInfoCache.delete(organizationId);
    } else {
      this.clinicInfoCache.clear();
    }
  }

  /**
   * Retrieves sanitized clinic identity and contact information.
   * Cached in-memory per organization with a 60-second TTL to avoid repeated DB roundtrips.
   */
  public static async getClinicInfo(
    organizationId: string,
  ): Promise<ClinicInfoResult | null> {
    const cached = this.clinicInfoCache.get(organizationId);
    if (cached && Date.now() - cached.timestamp < this.CLINIC_INFO_TTL_MS) {
      return cached.data;
    }

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

    this.clinicInfoCache.set(organizationId, {
      data: org,
      timestamp: Date.now(),
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
