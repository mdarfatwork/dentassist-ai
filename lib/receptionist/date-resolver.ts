/**
 * Server-Side Timezone-Aware Date & Time Range Resolver
 * Accurately calculates target calendar dates (YYYY-MM-DD) for relative expressions
 * ("today", "tomorrow", "next Monday", etc.) strictly anchored to the organization's
 * configured IANA timezone (e.g. "Asia/Kolkata", "America/Chicago").
 */

export interface ResolvedDateResult {
  dateStr: string; // YYYY-MM-DD
  dayOfWeek: string; // "MONDAY", "TUESDAY", etc.
  displayDate: string; // "Tuesday, September 22, 2026"
}

export interface ResolvedTimeRange {
  start?: string; // HH:mm
  end?: string; // HH:mm
}

const DAY_NAME_TO_INDEX: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

/**
 * Returns today's date broken down in the target IANA timezone.
 */
export function getNowInTimezone(timezone: string): {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number;
  minute: number;
  dayOfWeekIndex: number; // 0 (Sun) - 6 (Sat)
} {
  const validTimezone = isValidTimezone(timezone) ? timezone : "UTC";
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: validTimezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    weekday: "short",
  });

  const parts = formatter.formatToParts(now);
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth() + 1;
  let day = now.getUTCDate();
  let hour = now.getUTCHours();
  let minute = now.getUTCMinutes();
  let weekdayStr = "Sun";

  for (const part of parts) {
    if (part.type === "year") year = parseInt(part.value, 10);
    if (part.type === "month") month = parseInt(part.value, 10);
    if (part.type === "day") day = parseInt(part.value, 10);
    if (part.type === "hour") hour = parseInt(part.value, 10);
    if (part.type === "minute") minute = parseInt(part.value, 10);
    if (part.type === "weekday") weekdayStr = part.value;
  }

  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeekIndex = dayMap[weekdayStr] ?? 0;

  return { year, month, day, hour, minute, dayOfWeekIndex };
}

function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatDateResult(d: Date, timezone: string): ResolvedDateResult {
  const y = d.getUTCFullYear();
  const m = pad2(d.getUTCMonth() + 1);
  const day = pad2(d.getUTCDate());
  const dateStr = `${y}-${m}-${day}`;

  const days = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];
  const dayOfWeek = days[d.getUTCDay()];

  const validTimezone = isValidTimezone(timezone) ? timezone : "UTC";
  let displayDate = "";
  try {
    displayDate = new Intl.DateTimeFormat("en-US", {
      timeZone: validTimezone,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);
  } catch {
    displayDate = dateStr;
  }

  return { dateStr, dayOfWeek, displayDate };
}

/**
 * Resolves a date reference (relative or explicit) into a concrete YYYY-MM-DD date.
 */
export function resolveDateReference(
  rawRef: string | undefined | null,
  timezone: string,
): ResolvedDateResult {
  const validTimezone = isValidTimezone(timezone) ? timezone : "UTC";
  const nowTz = getNowInTimezone(validTimezone);

  // Default to today if no date specified
  if (!rawRef || !rawRef.trim()) {
    const todayUtc = new Date(
      Date.UTC(nowTz.year, nowTz.month - 1, nowTz.day, 12, 0, 0),
    );
    return formatDateResult(todayUtc, validTimezone);
  }

  const trimmed = rawRef.trim().toLowerCase();

  // 1. Direct YYYY-MM-DD pattern
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return formatDateResult(dt, validTimezone);
  }

  // 2. Relative "today"
  if (
    trimmed === "today" ||
    trimmed.includes("this morning") ||
    trimmed.includes("this afternoon")
  ) {
    const dt = new Date(
      Date.UTC(nowTz.year, nowTz.month - 1, nowTz.day, 12, 0, 0),
    );
    return formatDateResult(dt, validTimezone);
  }

  // 3. Relative "tomorrow"
  if (trimmed === "tomorrow" || trimmed.includes("tomorrow")) {
    const dt = new Date(
      Date.UTC(nowTz.year, nowTz.month - 1, nowTz.day + 1, 12, 0, 0),
    );
    return formatDateResult(dt, validTimezone);
  }

  // 4. Relative "day after tomorrow"
  if (trimmed.includes("day after tomorrow")) {
    const dt = new Date(
      Date.UTC(nowTz.year, nowTz.month - 1, nowTz.day + 2, 12, 0, 0),
    );
    return formatDateResult(dt, validTimezone);
  }

  // 5. Day of week matching ("Monday", "this Friday", "next Tuesday", etc.)
  for (const [dayName, targetIndex] of Object.entries(DAY_NAME_TO_INDEX)) {
    const regex = new RegExp(`\\b${dayName}\\b`, "i");
    if (regex.test(trimmed)) {
      const isNextWeek = trimmed.includes("next");
      const currentDayIndex = nowTz.dayOfWeekIndex;

      let daysAhead = targetIndex - currentDayIndex;
      if (daysAhead <= 0) {
        daysAhead += 7;
      }
      if (isNextWeek && daysAhead < 7) {
        daysAhead += 7;
      }

      const dt = new Date(
        Date.UTC(nowTz.year, nowTz.month - 1, nowTz.day + daysAhead, 12, 0, 0),
      );
      return formatDateResult(dt, validTimezone);
    }
  }

  // 6. Natural date parsing fallback (e.g. "Sept 25", "October 3rd", "25th September")
  const parsedTimestamp = Date.parse(`${rawRef} ${nowTz.year} UTC`);
  if (!isNaN(parsedTimestamp)) {
    const dt = new Date(parsedTimestamp);
    // If the parsed date is in the past, assume next year
    if (dt.getUTCMonth() < nowTz.month - 1) {
      dt.setUTCFullYear(nowTz.year + 1);
    }
    return formatDateResult(dt, validTimezone);
  }

  // Fallback: Default to tomorrow if unable to parse
  const fallbackDt = new Date(
    Date.UTC(nowTz.year, nowTz.month - 1, nowTz.day + 1, 12, 0, 0),
  );
  return formatDateResult(fallbackDt, validTimezone);
}

/**
 * Resolves natural time preferences ("morning", "afternoon", "evening", "10am") into HH:mm bounds.
 */
export function resolveTimePreference(preference?: {
  type?: "morning" | "afternoon" | "evening" | "exact";
  value?: string;
}): ResolvedTimeRange | undefined {
  if (!preference) return undefined;

  switch (preference.type) {
    case "morning":
      return { start: "08:00", end: "12:00" };
    case "afternoon":
      return { start: "12:00", end: "17:00" };
    case "evening":
      return { start: "17:00", end: "20:00" };
    case "exact":
      if (preference.value) {
        const timeMatch = preference.value.match(
          /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i,
        );
        if (timeMatch) {
          let h = parseInt(timeMatch[1], 10);
          const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          const meridian = timeMatch[3]?.toLowerCase();

          if (meridian === "pm" && h < 12) h += 12;
          if (meridian === "am" && h === 12) h = 0;

          const startStr = `${pad2(h)}:${pad2(m)}`;
          const endH = Math.min(h + 2, 20);
          const endStr = `${pad2(endH)}:${pad2(m)}`;
          return { start: startStr, end: endStr };
        }
      }
      return undefined;
    default:
      return undefined;
  }
}
