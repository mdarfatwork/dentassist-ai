/**
 * Calendar Service Abstraction
 *
 * Provides a clean interface for checking external calendar availability,
 * creating, updating, and deleting appointment events.
 *
 * NOTE: Full Google Calendar OAuth sync is scheduled for Phase 6.
 * The LocalCalendarService implementation manages event identifiers and
 * external slot conflicts locally, providing an exact seam for Phase 6
 * Google Calendar API integration without breaking or faking external API calls.
 */

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
  syncStatus: "synced" | "local_pending_phase6";
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
}

export const calendarService: ICalendarService = new LocalCalendarService();
