import { GoogleCalendarService } from "./google-calendar-service";
import { CalendarDomainError } from "./types";

export interface CalendarSlotQuery {
  organizationId: string;
  dentistId?: string;
  startTime: Date;
  endTime: Date;
}

export interface CreateCalendarEventInput {
  organizationId: string;
  dentistId?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendeeEmail?: string;
  attendeeName?: string;
}

export interface UpdateCalendarEventInput {
  organizationId: string;
  eventId: string;
  startTime: Date;
  endTime: Date;
  title?: string;
}

export interface CalendarEventResult {
  eventId: string;
  syncStatus: "synced" | "local_pending_phase6" | "skipped";
}

export interface ICalendarService {
  checkAvailability(
    query: CalendarSlotQuery,
  ): Promise<{ isAvailable: boolean; conflictReason?: string }>;
  createEvent(input: CreateCalendarEventInput): Promise<CalendarEventResult>;
  updateEvent(input: UpdateCalendarEventInput): Promise<CalendarEventResult>;
  deleteEvent(params: {
    organizationId: string;
    eventId: string;
  }): Promise<void>;
}

export class LocalCalendarService implements ICalendarService {
  private static events = new Map<
    string,
    {
      id: string;
      organizationId: string;
      dentistId?: string;
      title: string;
      startTime: Date;
      endTime: Date;
    }
  >();

  public async checkAvailability(
    query: CalendarSlotQuery,
  ): Promise<{ isAvailable: boolean; conflictReason?: string }> {
    const { organizationId, dentistId, startTime, endTime } = query;

    for (const event of LocalCalendarService.events.values()) {
      if (event.organizationId !== organizationId) continue;
      if (dentistId && event.dentistId && event.dentistId !== dentistId)
        continue;

      // Check slot overlap: start < event.endTime && end > event.startTime
      if (startTime < event.endTime && endTime > event.startTime) {
        return {
          isAvailable: false,
          conflictReason: `Overlaps with existing calendar event: "${event.title}"`,
        };
      }
    }

    return { isAvailable: true };
  }

  public async createEvent(
    input: CreateCalendarEventInput,
  ): Promise<CalendarEventResult> {
    const eventId = `cal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    LocalCalendarService.events.set(eventId, {
      id: eventId,
      organizationId: input.organizationId,
      dentistId: input.dentistId,
      title: input.title,
      startTime: input.startTime,
      endTime: input.endTime,
    });

    return {
      eventId,
      syncStatus: "local_pending_phase6",
    };
  }

  public async updateEvent(
    input: UpdateCalendarEventInput,
  ): Promise<CalendarEventResult> {
    const existing = LocalCalendarService.events.get(input.eventId);
    if (existing && existing.organizationId === input.organizationId) {
      existing.startTime = input.startTime;
      existing.endTime = input.endTime;
      if (input.title) existing.title = input.title;
      LocalCalendarService.events.set(input.eventId, existing);
    }

    return {
      eventId: input.eventId,
      syncStatus: "local_pending_phase6",
    };
  }

  public async deleteEvent(params: {
    organizationId: string;
    eventId: string;
  }): Promise<void> {
    const existing = LocalCalendarService.events.get(params.eventId);
    if (existing && existing.organizationId === params.organizationId) {
      LocalCalendarService.events.delete(params.eventId);
    }
  }

  public static clear(): void {
    LocalCalendarService.events.clear();
  }
}

/**
 * Hybrid calendar service:
 * Checks Google Calendar FreeBusy when configured and connected.
 * Creates, updates, and deletes events directly on the clinic's Google Calendar.
 * Falls back to LocalCalendarService if Google Calendar is not yet linked.
 */
export class HybridCalendarService implements ICalendarService {
  private local = new LocalCalendarService();

  public async checkAvailability(
    query: CalendarSlotQuery,
  ): Promise<{ isAvailable: boolean; conflictReason?: string }> {
    try {
      const busyList = await GoogleCalendarService.queryFreeBusy({
        organizationId: query.organizationId,
        timeMin: query.startTime,
        timeMax: query.endTime,
      });

      for (const busy of busyList) {
        if (query.startTime < busy.end && query.endTime > busy.start) {
          return {
            isAvailable: false,
            conflictReason:
              "Conflict detected: Overlaps with busy period on Google Calendar.",
          };
        }
      }
    } catch (err) {
      if (
        err instanceof CalendarDomainError &&
        err.code === "CALENDAR_AVAILABILITY_UNAVAILABLE"
      ) {
        throw err;
      }
      // Non-fatal or disconnected, fall back to checking local service
    }

    return this.local.checkAvailability(query);
  }

  public async createEvent(
    input: CreateCalendarEventInput,
  ): Promise<CalendarEventResult> {
    try {
      const res = await GoogleCalendarService.createEvent({
        organizationId: input.organizationId,
        dentistId: input.dentistId,
        title: input.title,
        description: input.description,
        startTime: input.startTime,
        endTime: input.endTime,
        attendeeEmail: input.attendeeEmail,
        attendeeName: input.attendeeName,
      });

      if (res.syncStatus === "synced" && res.eventId) {
        return { eventId: res.eventId, syncStatus: "synced" };
      }
    } catch (err) {
      console.error(
        "[CalendarService] Google Calendar createEvent failed:",
        err,
      );
      throw err;
    }

    return this.local.createEvent(input);
  }

  public async updateEvent(
    input: UpdateCalendarEventInput,
  ): Promise<CalendarEventResult> {
    try {
      const res = await GoogleCalendarService.updateEvent({
        organizationId: input.organizationId,
        eventId: input.eventId,
        startTime: input.startTime,
        endTime: input.endTime,
        title: input.title,
      });

      if (res.syncStatus === "synced") {
        return { eventId: res.eventId, syncStatus: "synced" };
      }
    } catch (err) {
      console.warn(
        "[CalendarService] Google Calendar updateEvent failed:",
        err,
      );
    }

    return this.local.updateEvent(input);
  }

  public async deleteEvent(params: {
    organizationId: string;
    eventId: string;
  }): Promise<void> {
    await GoogleCalendarService.deleteEvent({
      organizationId: params.organizationId,
      eventId: params.eventId,
    });
    await this.local.deleteEvent(params);
  }
}

export const calendarService: ICalendarService = new HybridCalendarService();
