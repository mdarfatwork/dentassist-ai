import { db } from "@/lib/db";
import { encryptToken, decryptToken } from "./encryption";
import {
  CalendarDomainError,
  GoogleCalendarItem,
  GoogleCalendarConnectionStatus,
  FreeBusyInterval,
} from "./types";

export interface CreateEventParams {
  organizationId: string;
  dentistId?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendeeEmail?: string;
  attendeeName?: string;
}

export interface UpdateEventParams {
  organizationId: string;
  eventId: string;
  startTime: Date;
  endTime: Date;
  title?: string;
}

export class GoogleCalendarService {
  /**
   * Retrieves connection status for the organization without exposing any sensitive tokens
   */
  public static async getConnectionStatus(
    organizationId: string,
  ): Promise<GoogleCalendarConnectionStatus> {
    const connection = await db.googleCalendarConnection.findUnique({
      where: { organizationId },
    });

    if (!connection) {
      return {
        status: "DISCONNECTED",
        googleAccountEmail: null,
        calendarId: null,
        calendarName: null,
        isConnected: false,
      };
    }

    const isConnected =
      connection.status === "CONNECTED" && Boolean(connection.calendarId);

    return {
      status: connection.status,
      googleAccountEmail: connection.googleAccountEmail,
      calendarId: connection.calendarId,
      calendarName: connection.calendarName,
      isConnected,
    };
  }

  /**
   * Retrieves a valid access token for Google API calls, refreshing it automatically if expired
   */
  public static async getValidAccessToken(
    organizationId: string,
  ): Promise<{ accessToken: string; calendarId: string | null }> {
    const connection = await db.googleCalendarConnection.findUnique({
      where: { organizationId },
    });

    if (!connection || connection.status === "DISCONNECTED") {
      throw new CalendarDomainError(
        "GOOGLE_CALENDAR_NOT_CONNECTED",
        "Google Calendar is not connected for this clinic.",
      );
    }

    if (connection.status === "REAUTH_REQUIRED") {
      throw new CalendarDomainError(
        "GOOGLE_CALENDAR_REAUTH_REQUIRED",
        "Google Calendar requires reauthorization. Please reconnect in Clinic Settings.",
      );
    }

    if (!connection.accessToken) {
      throw new CalendarDomainError(
        "GOOGLE_CALENDAR_NOT_CONNECTED",
        "No access token found for Google Calendar connection.",
      );
    }

    const now = Date.now();
    // Refresh token if expiring within 5 minutes or already expired
    const isExpired =
      !connection.tokenExpiry ||
      connection.tokenExpiry.getTime() - now < 5 * 60 * 1000;

    if (!isExpired) {
      return {
        accessToken: decryptToken(connection.accessToken),
        calendarId: connection.calendarId,
      };
    }

    // Attempt token refresh
    if (!connection.refreshToken) {
      await db.googleCalendarConnection.update({
        where: { organizationId },
        data: { status: "REAUTH_REQUIRED" },
      });
      throw new CalendarDomainError(
        "GOOGLE_CALENDAR_REAUTH_REQUIRED",
        "Refresh token missing. Reauthorization is required.",
      );
    }

    const decryptedRefreshToken = decryptToken(connection.refreshToken);
    const refreshed = await this.refreshAccessToken(
      organizationId,
      decryptedRefreshToken,
    );

    return {
      accessToken: refreshed,
      calendarId: connection.calendarId,
    };
  }

  /**
   * Refreshes the Google OAuth access token using the stored refresh token
   */
  private static async refreshAccessToken(
    organizationId: string,
    refreshToken: string,
  ): Promise<string> {
    const clientId =
      process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret =
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET ||
      process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new CalendarDomainError(
        "GOOGLE_CALENDAR_API_ERROR",
        "Google OAuth credentials missing for token refresh.",
      );
    }

    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.warn(
          `[GoogleCalendarService] Refresh token failed for org ${organizationId}:`,
          errorBody,
        );

        // Mark REAUTH_REQUIRED
        await db.googleCalendarConnection.update({
          where: { organizationId },
          data: { status: "REAUTH_REQUIRED" },
        });

        throw new CalendarDomainError(
          "GOOGLE_CALENDAR_REAUTH_REQUIRED",
          "Google Calendar reauthorization is required.",
        );
      }

      const data = await response.json();
      const newAccessToken = data.access_token as string;
      const expiresIn = (data.expires_in as number) || 3600;

      const encryptedAccess = encryptToken(newAccessToken);
      const newExpiry = new Date(Date.now() + expiresIn * 1000);

      // If Google issued a new refresh token, encrypt and update it too
      const newRefreshToken = data.refresh_token as string | undefined;
      const encryptedRefresh = newRefreshToken
        ? encryptToken(newRefreshToken)
        : undefined;

      await db.googleCalendarConnection.update({
        where: { organizationId },
        data: {
          accessToken: encryptedAccess,
          ...(encryptedRefresh ? { refreshToken: encryptedRefresh } : {}),
          tokenExpiry: newExpiry,
          status: "CONNECTED",
        },
      });

      console.log(
        `[GoogleCalendarService] Successfully refreshed access token for org ${organizationId}`,
      );

      return newAccessToken;
    } catch (err) {
      if (err instanceof CalendarDomainError) throw err;
      throw new CalendarDomainError(
        "GOOGLE_CALENDAR_API_ERROR",
        "Failed to refresh Google Calendar access token.",
      );
    }
  }

  /**
   * Lists all Google Calendars accessible to the connected Google account
   */
  public static async listCalendars(
    organizationId: string,
  ): Promise<GoogleCalendarItem[]> {
    const { accessToken } = await this.getValidAccessToken(organizationId);

    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[GoogleCalendarService] listCalendars error (${response.status}):`,
        errorText,
      );
      if (response.status === 401) {
        throw new CalendarDomainError(
          "GOOGLE_CALENDAR_REAUTH_REQUIRED",
          "Authentication failed with Google Calendar. Please reconnect.",
        );
      }
      throw new CalendarDomainError(
        "GOOGLE_CALENDAR_API_ERROR",
        "Unable to list Google Calendars.",
      );
    }

    const data = await response.json();
    const items = (data.items || []) as Array<{
      id: string;
      summary: string;
      primary?: boolean;
      description?: string;
      timeZone?: string;
    }>;

    return items.map((item) => ({
      id: item.id,
      summary: item.summary,
      primary: Boolean(item.primary),
      description: item.description,
      timeZone: item.timeZone,
    }));
  }

  /**
   * Selects which Google Calendar the clinic will synchronize with
   */
  public static async selectCalendar(params: {
    organizationId: string;
    calendarId: string;
    calendarName: string;
  }): Promise<{ success: boolean; calendarId: string; calendarName: string }> {
    const { organizationId, calendarId, calendarName } = params;

    await db.googleCalendarConnection.update({
      where: { organizationId },
      data: {
        calendarId,
        calendarName,
        status: "CONNECTED",
      },
    });

    console.log(
      `[GoogleCalendarService] Calendar selected for org ${organizationId}: "${calendarName}" (${calendarId})`,
    );

    return {
      success: true,
      calendarId,
      calendarName,
    };
  }

  /**
   * Disconnects the clinic's Google Calendar connection
   */
  public static async disconnect(
    organizationId: string,
  ): Promise<{ success: boolean }> {
    await db.googleCalendarConnection.updateMany({
      where: { organizationId },
      data: {
        calendarId: null,
        calendarName: null,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
        status: "DISCONNECTED",
      },
    });

    console.log(
      `[GoogleCalendarService] Disconnected Google Calendar for org ${organizationId}`,
    );

    return { success: true };
  }

  /**
   * Queries Google Calendar FreeBusy API for busy intervals on the configured calendar
   */
  public static async queryFreeBusy(params: {
    organizationId: string;
    timeMin: Date;
    timeMax: Date;
  }): Promise<FreeBusyInterval[]> {
    const { organizationId, timeMin, timeMax } = params;

    const connection = await db.googleCalendarConnection.findUnique({
      where: { organizationId },
    });

    // If not connected or calendar not selected yet, there are no Google Calendar busy periods
    if (
      !connection ||
      connection.status !== "CONNECTED" ||
      !connection.calendarId
    ) {
      return [];
    }

    const { accessToken, calendarId } =
      await this.getValidAccessToken(organizationId);
    if (!calendarId) return [];

    const makeRequest = async (token: string) => {
      return await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          items: [{ id: calendarId }],
        }),
      });
    };

    let response = await makeRequest(accessToken);

    // If 401, retry once after refreshing token
    if (response.status === 401) {
      console.warn(
        `[GoogleCalendarService] FreeBusy query 401: Retrying with refreshed token...`,
      );
      if (connection.refreshToken) {
        const decryptedRefresh = decryptToken(connection.refreshToken);
        const newToken = await this.refreshAccessToken(
          organizationId,
          decryptedRefresh,
        );
        response = await makeRequest(newToken);
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[GoogleCalendarService] FreeBusy query failed (${response.status}):`,
        errorText,
      );
      throw new CalendarDomainError(
        "CALENDAR_AVAILABILITY_UNAVAILABLE",
        "Clinic calendar availability could not be verified right now. Please try again shortly.",
      );
    }

    const data = await response.json();
    const calendarData = data.calendars?.[calendarId];
    const busySlots = (calendarData?.busy || []) as Array<{
      start: string;
      end: string;
    }>;

    return busySlots.map((b) => ({
      start: new Date(b.start),
      end: new Date(b.end),
    }));
  }

  /**
   * Creates a Google Calendar event for a confirmed appointment
   */
  public static async createEvent(
    params: CreateEventParams,
  ): Promise<{ eventId: string; syncStatus: "synced" | "skipped" }> {
    const {
      organizationId,
      title,
      description,
      startTime,
      endTime,
      attendeeEmail,
      attendeeName,
    } = params;

    const connection = await db.googleCalendarConnection.findUnique({
      where: { organizationId },
    });

    if (
      !connection ||
      connection.status !== "CONNECTED" ||
      !connection.calendarId
    ) {
      console.log(
        `[GoogleCalendarService] Calendar not connected for org ${organizationId}; skipping Google event creation.`,
      );
      return { eventId: "", syncStatus: "skipped" };
    }

    const { accessToken, calendarId } =
      await this.getValidAccessToken(organizationId);
    if (!calendarId) {
      return { eventId: "", syncStatus: "skipped" };
    }

    const eventPayload = {
      summary: title,
      description: description || "",
      start: {
        dateTime: startTime.toISOString(),
      },
      end: {
        dateTime: endTime.toISOString(),
      },
      attendees: attendeeEmail
        ? [
            {
              email: attendeeEmail,
              displayName: attendeeName || undefined,
            },
          ]
        : undefined,
    };

    const makeRequest = async (token: string) => {
      return await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventPayload),
        },
      );
    };

    let response = await makeRequest(accessToken);

    if (response.status === 401 && connection.refreshToken) {
      const decryptedRefresh = decryptToken(connection.refreshToken);
      const newToken = await this.refreshAccessToken(
        organizationId,
        decryptedRefresh,
      );
      response = await makeRequest(newToken);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[GoogleCalendarService] Failed to create Google event (${response.status}):`,
        errorText,
      );
      throw new CalendarDomainError(
        "GOOGLE_CALENDAR_API_ERROR",
        "Failed to synchronize appointment event to Google Calendar.",
      );
    }

    const data = await response.json();
    console.log(
      `[GoogleCalendarService] Created Google Calendar event: ${data.id}`,
    );

    return {
      eventId: data.id,
      syncStatus: "synced",
    };
  }

  /**
   * Updates an existing Google Calendar event
   */
  public static async updateEvent(
    params: UpdateEventParams,
  ): Promise<{ eventId: string; syncStatus: "synced" | "skipped" }> {
    const { organizationId, eventId, startTime, endTime, title } = params;

    if (!eventId) return { eventId: "", syncStatus: "skipped" };

    const connection = await db.googleCalendarConnection.findUnique({
      where: { organizationId },
    });

    if (
      !connection ||
      connection.status !== "CONNECTED" ||
      !connection.calendarId
    ) {
      return { eventId, syncStatus: "skipped" };
    }

    const { accessToken, calendarId } =
      await this.getValidAccessToken(organizationId);
    if (!calendarId) return { eventId, syncStatus: "skipped" };

    const patchPayload: Record<string, unknown> = {
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
    };
    if (title) patchPayload.summary = title;

    const makeRequest = async (token: string) => {
      return await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(patchPayload),
        },
      );
    };

    let response = await makeRequest(accessToken);

    if (response.status === 401 && connection.refreshToken) {
      const decryptedRefresh = decryptToken(connection.refreshToken);
      const newToken = await this.refreshAccessToken(
        organizationId,
        decryptedRefresh,
      );
      response = await makeRequest(newToken);
    }

    if (!response.ok) {
      console.warn(
        `[GoogleCalendarService] Failed to update Google Calendar event ${eventId} (${response.status})`,
      );
      return { eventId, syncStatus: "skipped" };
    }

    return { eventId, syncStatus: "synced" };
  }

  /**
   * Deletes an event from Google Calendar
   */
  public static async deleteEvent(params: {
    organizationId: string;
    eventId: string;
  }): Promise<void> {
    const { organizationId, eventId } = params;
    if (!eventId) return;

    const connection = await db.googleCalendarConnection.findUnique({
      where: { organizationId },
    });

    if (
      !connection ||
      connection.status !== "CONNECTED" ||
      !connection.calendarId
    ) {
      return;
    }

    try {
      const { accessToken, calendarId } =
        await this.getValidAccessToken(organizationId);
      if (!calendarId) return;

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok && response.status !== 404 && response.status !== 410) {
        console.warn(
          `[GoogleCalendarService] Failed to delete event ${eventId}: status ${response.status}`,
        );
      }
    } catch (err) {
      console.warn(
        `[GoogleCalendarService] Error deleting Google Calendar event:`,
        err,
      );
    }
  }
}
