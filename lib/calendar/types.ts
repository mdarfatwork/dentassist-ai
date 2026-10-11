import { GoogleCalendarStatus } from "@prisma/client";

export { GoogleCalendarStatus };

export class CalendarDomainError extends Error {
  constructor(
    public readonly code:
      | "GOOGLE_CALENDAR_NOT_CONNECTED"
      | "GOOGLE_CALENDAR_REAUTH_REQUIRED"
      | "GOOGLE_CALENDAR_API_ERROR"
      | "CALENDAR_AVAILABILITY_UNAVAILABLE"
      | "SERVICE_NOT_FOUND"
      | "DENTIST_NOT_FOUND"
      | "NO_AVAILABILITY"
      | "APPOINTMENT_NOT_FOUND"
      | "APPOINTMENT_ALREADY_CANCELLED"
      | "APPOINTMENT_CONFLICT"
      | "BOOKING_CONFIRMATION_REQUIRED"
      | "INVALID_OAUTH_STATE"
      | "OAUTH_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "CalendarDomainError";
  }
}

export interface GoogleCalendarItem {
  id: string;
  summary: string;
  primary?: boolean;
  description?: string;
  timeZone?: string;
}

export interface FreeBusyInterval {
  start: Date;
  end: Date;
}

export interface GoogleCalendarConnectionStatus {
  status: GoogleCalendarStatus;
  googleAccountEmail?: string | null;
  calendarId?: string | null;
  calendarName?: string | null;
  isConnected: boolean;
}
