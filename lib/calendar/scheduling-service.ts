import { db } from "@/lib/db";
import { GoogleCalendarService } from "./google-calendar-service";
import { CalendarDomainError } from "./types";
import { type DayOfWeek, type AppointmentSource } from "@prisma/client";
import { DEFAULT_WORKING_HOURS } from "@/lib/validations/working-hours";

export interface CheckAvailabilityInput {
  organizationId: string;
  serviceId: string;
  dentistId?: string;
  date: string; // YYYY-MM-DD
  preferredTimeRange?: {
    start?: string; // HH:mm
    end?: string; // HH:mm
  };
}

export interface AvailableSlot {
  startTime: string; // ISO string (UTC)
  endTime: string; // ISO string (UTC)
  timeString: string; // "10:00 AM" (Clinic timezone)
  dentistId?: string;
  dentistName?: string;
}

export interface StructuredServiceInfo {
  id: string;
  name: string;
  durationMinutes: number;
}

export interface AvailabilityResult {
  isAvailable: boolean;
  date: string;
  timezone: string;
  service: StructuredServiceInfo;
  serviceName: string; // Backwards compatible with existing receptionist
  durationMinutes: number;
  availableSlots: AvailableSlot[];
  message?: string;
}

export interface BookAppointmentInput {
  organizationId: string;
  serviceId: string;
  dentistId?: string;
  startTime: string; // ISO string
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  source?: AppointmentSource;
  notes?: string;
}

export interface BookingResult {
  success: boolean;
  reference: string;
  appointmentId: string;
  patientName: string;
  serviceName: string;
  dentistName: string;
  startTimeFormatted: string;
  endTimeFormatted: string;
  timezone: string;
  calendarEventId?: string;
}

export interface CancelAppointmentInput {
  organizationId: string;
  reference: string;
  patientEmail?: string;
  patientPhone?: string;
  reason?: string;
}

export interface RescheduleAppointmentInput {
  organizationId: string;
  reference: string;
  patientEmail?: string;
  patientPhone?: string;
  newStartTime: string;
  newDentistId?: string;
}

function generateAppointmentReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `DA-${code}`;
}

const DAY_INDEX_TO_NAME: DayOfWeek[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

export function formatTimeDisplay(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    }).format(date);
  }
}

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * SchedulingService
 * The unified source of truth for appointment availability and scheduling across:
 * - AI Chat Receptionist
 * - AI Voice Workflow
 * - Clinic Staff Dashboard (Manual booking)
 *
 * Integrates:
 * 1. Clinic working hours
 * 2. Practitioner roster & schedules
 * 3. Holiday closures
 * 4. Service duration
 * 5. Existing DentAssist PostgreSQL bookings
 * 6. Google Calendar busy periods
 */
export class SchedulingService {
  /**
   * Calculates actual, verified available appointment slots.
   */
  public static async checkAvailability(
    input: CheckAvailabilityInput,
  ): Promise<AvailabilityResult> {
    const { organizationId, serviceId, dentistId, date, preferredTimeRange } =
      input;

    const checkStart = performance.now();

    // 1. Validate date format (YYYY-MM-DD)
    const parsedDate = new Date(`${date}T00:00:00Z`);
    if (isNaN(parsedDate.getTime())) {
      throw new CalendarDomainError(
        "CALENDAR_AVAILABILITY_UNAVAILABLE",
        `Invalid date format: "${date}". Expected YYYY-MM-DD.`,
      );
    }

    const dayOfWeek = DAY_INDEX_TO_NAME[parsedDate.getUTCDay()];
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    // 2. Fetch clinic scheduling configurations in parallel
    const [
      org,
      service,
      dentist,
      holidayClosure,
      workingHours,
      existingAppointments,
      clinicDentists,
      googleBusyIntervals,
    ] = await Promise.all([
      db.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true, timezone: true },
      }),
      db.service.findFirst({
        where: { id: serviceId, organizationId },
      }),
      dentistId
        ? db.dentist.findFirst({
            where: { id: dentistId, organizationId },
          })
        : Promise.resolve(null),
      db.holiday.findFirst({
        where: {
          organizationId,
          date: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      }),
      db.workingHours.findUnique({
        where: {
          organizationId_dayOfWeek: {
            organizationId,
            dayOfWeek,
          },
        },
      }),
      db.appointment.findMany({
        where: {
          organizationId,
          status: { in: ["CONFIRMED", "SCHEDULED"] },
          startTime: { gte: dayStart, lte: dayEnd },
        },
        select: {
          dentistId: true,
          startTime: true,
          endTime: true,
        },
      }),
      dentistId
        ? Promise.resolve([])
        : db.dentist.findMany({
            where: { organizationId },
            select: { id: true, name: true },
          }),
      GoogleCalendarService.queryFreeBusy({
        organizationId,
        timeMin: dayStart,
        timeMax: dayEnd,
      }).catch((err) => {
        if (
          err instanceof CalendarDomainError &&
          err.code === "CALENDAR_AVAILABILITY_UNAVAILABLE"
        ) {
          throw err;
        }
        console.warn(
          "[SchedulingService] Google Calendar busy query warning:",
          err,
        );
        return [];
      }),
    ]);

    if (!org) {
      throw new CalendarDomainError(
        "CALENDAR_AVAILABILITY_UNAVAILABLE",
        "Organization not found.",
      );
    }
    const timezone = org.timezone || "UTC";

    if (!service) {
      throw new CalendarDomainError(
        "SERVICE_NOT_FOUND",
        "The requested dental service is not offered by this clinic.",
      );
    }

    let verifiedDentistName = "Any Available Dentist";
    if (dentistId) {
      if (!dentist) {
        throw new CalendarDomainError(
          "DENTIST_NOT_FOUND",
          "The requested dentist is not registered at this clinic.",
        );
      }
      verifiedDentistName = dentist.name;
    }

    const serviceInfo: StructuredServiceInfo = {
      id: service.id,
      name: service.name,
      durationMinutes: service.durationMinutes,
    };

    // 3. Check holiday closure
    if (holidayClosure) {
      return {
        isAvailable: false,
        date,
        timezone,
        service: serviceInfo,
        serviceName: service.name,
        durationMinutes: service.durationMinutes,
        availableSlots: [],
        message: `The clinic is closed on ${date} for ${holidayClosure.name}.`,
      };
    }

    // 4. Check working hours
    const isOpen = workingHours
      ? workingHours.isOpen
      : (DEFAULT_WORKING_HOURS.find((d) => d.dayOfWeek === dayOfWeek)?.isOpen ??
        false);
    const startTimeStr =
      workingHours?.startTime ||
      DEFAULT_WORKING_HOURS.find((d) => d.dayOfWeek === dayOfWeek)?.startTime;
    const endTimeStr =
      workingHours?.endTime ||
      DEFAULT_WORKING_HOURS.find((d) => d.dayOfWeek === dayOfWeek)?.endTime;

    if (!isOpen || !startTimeStr || !endTimeStr) {
      return {
        isAvailable: false,
        date,
        timezone,
        service: serviceInfo,
        serviceName: service.name,
        durationMinutes: service.durationMinutes,
        availableSlots: [],
        message: `The clinic is closed on ${dayOfWeek.toLowerCase()}s.`,
      };
    }

    // 5. Generate and evaluate candidate slots
    const clinicOpenMinutes = parseTimeToMinutes(startTimeStr);
    const clinicCloseMinutes = parseTimeToMinutes(endTimeStr);
    const duration = service.durationMinutes || 30;
    const slotInterval = 30;

    let prefStartMinutes = clinicOpenMinutes;
    let prefEndMinutes = clinicCloseMinutes;

    if (preferredTimeRange?.start) {
      prefStartMinutes = Math.max(
        prefStartMinutes,
        parseTimeToMinutes(preferredTimeRange.start),
      );
    }
    if (preferredTimeRange?.end) {
      prefEndMinutes = Math.min(
        prefEndMinutes,
        parseTimeToMinutes(preferredTimeRange.end),
      );
    }

    const availableSlots: AvailableSlot[] = [];

    for (
      let currentMinutes = prefStartMinutes;
      currentMinutes + duration <= prefEndMinutes;
      currentMinutes += slotInterval
    ) {
      const slotTimeStr = minutesToTimeString(currentMinutes);
      const slotEndTimeStr = minutesToTimeString(currentMinutes + duration);

      const slotStart = new Date(`${date}T${slotTimeStr}:00.000Z`);
      const slotEnd = new Date(`${date}T${slotEndTimeStr}:00.000Z`);

      // A. Check Google Calendar busy interval overlap
      const isGoogleBusy = googleBusyIntervals.some(
        (b) => slotStart < b.end && slotEnd > b.start,
      );
      if (isGoogleBusy) {
        continue;
      }

      // B. Check DentAssist PostgreSQL appointment conflicts
      if (dentistId) {
        const hasConflict = existingAppointments.some((appt) => {
          if (appt.dentistId !== dentistId) return false;
          return slotStart < appt.endTime && slotEnd > appt.startTime;
        });

        if (!hasConflict) {
          availableSlots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            timeString: formatTimeDisplay(slotStart, timezone),
            dentistId,
            dentistName: verifiedDentistName,
          });
        }
      } else {
        // Any dentist requested: find first free dentist
        let assignedDentist =
          clinicDentists.length > 0 ? clinicDentists[0] : null;

        if (clinicDentists.length > 0) {
          const freeDentist = clinicDentists.find((dent) => {
            const hasConflict = existingAppointments.some(
              (appt) =>
                appt.dentistId === dent.id &&
                slotStart < appt.endTime &&
                slotEnd > appt.startTime,
            );
            return !hasConflict;
          });
          assignedDentist = freeDentist || null;
        }

        const isFreeOverall =
          clinicDentists.length === 0
            ? !existingAppointments.some(
                (appt) => slotStart < appt.endTime && slotEnd > appt.startTime,
              )
            : assignedDentist !== null;

        if (isFreeOverall) {
          availableSlots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            timeString: formatTimeDisplay(slotStart, timezone),
            dentistId: assignedDentist?.id,
            dentistName: assignedDentist?.name || "Clinic Staff",
          });
        }
      }
    }

    const totalMs = (performance.now() - checkStart).toFixed(1);
    console.log(
      `[SchedulingService.checkAvailability] Calculated ${availableSlots.length} available slots in ${totalMs}ms`,
    );

    return {
      isAvailable: availableSlots.length > 0,
      date,
      timezone,
      service: serviceInfo,
      serviceName: service.name,
      durationMinutes: service.durationMinutes,
      availableSlots,
      message:
        availableSlots.length > 0
          ? `Found ${availableSlots.length} available appointment slot(s) for ${service.name}.`
          : `No available slots found for ${service.name} on ${date}.`,
    };
  }

  /**
   * Performs the FINAL availability check right before booking, protecting against race conditions.
   */
  public static async verifySlotAvailable(params: {
    organizationId: string;
    dentistId?: string;
    startTime: Date;
    endTime: Date;
    excludeAppointmentId?: string;
  }): Promise<boolean> {
    const {
      organizationId,
      dentistId,
      startTime,
      endTime,
      excludeAppointmentId,
    } = params;

    // 1. Check DentAssist DB conflict
    const dbConflict = await db.appointment.findFirst({
      where: {
        organizationId,
        status: { in: ["CONFIRMED", "SCHEDULED"] },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
        ...(dentistId ? { dentistId } : {}),
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    if (dbConflict) {
      return false;
    }

    // 2. Check Google Calendar FreeBusy
    const googleBusy = await GoogleCalendarService.queryFreeBusy({
      organizationId,
      timeMin: startTime,
      timeMax: endTime,
    }).catch(() => []);

    const isGoogleBusy = googleBusy.some(
      (b) => startTime < b.end && endTime > b.start,
    );

    return !isGoogleBusy;
  }

  /**
   * Books an appointment with double-booking prevention, transactional safety, and Google Calendar sync.
   */
  public static async bookAppointment(
    input: BookAppointmentInput,
  ): Promise<BookingResult> {
    const {
      organizationId,
      serviceId,
      dentistId,
      startTime,
      patientName,
      patientEmail,
      patientPhone,
      source = "AI_CHAT",
      notes,
    } = input;

    // 1. Resolve org and timezone
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, timezone: true },
    });
    if (!org) {
      throw new CalendarDomainError(
        "CALENDAR_AVAILABILITY_UNAVAILABLE",
        "Organization not found.",
      );
    }
    const timezone = org.timezone || "UTC";

    // 2. Resolve service
    const service = await db.service.findFirst({
      where: { id: serviceId, organizationId },
    });
    if (!service) {
      throw new CalendarDomainError(
        "SERVICE_NOT_FOUND",
        "Service not found in this organization.",
      );
    }

    // 3. Resolve dentist
    let resolvedDentistId = dentistId;
    let dentistName = "Clinic Staff";

    if (dentistId) {
      const dentist = await db.dentist.findFirst({
        where: { id: dentistId, organizationId },
      });
      if (!dentist) {
        throw new CalendarDomainError(
          "DENTIST_NOT_FOUND",
          "Dentist not found in this organization.",
        );
      }
      dentistName = dentist.name;
    } else {
      const firstDentist = await db.dentist.findFirst({
        where: { organizationId },
      });
      if (firstDentist) {
        resolvedDentistId = firstDentist.id;
        dentistName = firstDentist.name;
      }
    }

    // 4. Validate time
    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
      throw new CalendarDomainError(
        "CALENDAR_AVAILABILITY_UNAVAILABLE",
        "Invalid start time provided.",
      );
    }
    const end = new Date(start.getTime() + service.durationMinutes * 60 * 1000);

    // 5. Check holiday & working hours
    const dateStr = start.toISOString().split("T")[0];
    const dayOfWeek = DAY_INDEX_TO_NAME[start.getUTCDay()];

    const holiday = await db.holiday.findFirst({
      where: {
        organizationId,
        date: {
          gte: new Date(`${dateStr}T00:00:00.000Z`),
          lt: new Date(`${dateStr}T23:59:59.999Z`),
        },
      },
    });
    if (holiday) {
      throw new CalendarDomainError(
        "NO_AVAILABILITY",
        `Cannot book on ${dateStr}: clinic is closed for ${holiday.name}.`,
      );
    }

    const workingHours = await db.workingHours.findUnique({
      where: { organizationId_dayOfWeek: { organizationId, dayOfWeek } },
    });
    const isOpen = workingHours
      ? workingHours.isOpen
      : (DEFAULT_WORKING_HOURS.find((d) => d.dayOfWeek === dayOfWeek)?.isOpen ??
        false);

    if (!isOpen) {
      throw new CalendarDomainError(
        "NO_AVAILABILITY",
        `Cannot book on ${dayOfWeek.toLowerCase()}s: clinic is closed.`,
      );
    }

    // 6. FINAL availability check (protect against double booking)
    const isFree = await this.verifySlotAvailable({
      organizationId,
      dentistId: resolvedDentistId,
      startTime: start,
      endTime: end,
    });

    if (!isFree) {
      throw new CalendarDomainError(
        "APPOINTMENT_CONFLICT",
        "This appointment slot was just booked by another patient. Please select another time.",
      );
    }

    // 7. Atomic DB Transaction for appointment creation
    const reference = generateAppointmentReference();

    let appointment;
    try {
      appointment = await db.$transaction(async (tx) => {
        // Re-verify conflict inside transaction boundary
        const innerConflict = await tx.appointment.findFirst({
          where: {
            organizationId,
            status: { in: ["CONFIRMED", "SCHEDULED"] },
            ...(resolvedDentistId ? { dentistId: resolvedDentistId } : {}),
            startTime: { lt: end },
            endTime: { gt: start },
          },
        });

        if (innerConflict) {
          throw new CalendarDomainError(
            "APPOINTMENT_CONFLICT",
            "This appointment slot was just booked by another patient. Please select another time.",
          );
        }

        return await tx.appointment.create({
          data: {
            reference,
            organizationId,
            dentistId: resolvedDentistId,
            serviceId: service.id,
            startTime: start,
            endTime: end,
            status: "CONFIRMED",
            source,
            patientName,
            patientEmail,
            patientPhone,
            notes,
          },
        });
      });
    } catch (txErr: unknown) {
      if (txErr instanceof CalendarDomainError) throw txErr;
      const isPrismaConflict =
        typeof txErr === "object" &&
        txErr !== null &&
        "code" in txErr &&
        (txErr as { code?: string }).code === "P2002";
      const msg = txErr instanceof Error ? txErr.message : String(txErr);
      if (
        isPrismaConflict ||
        msg.includes("Unique constraint") ||
        msg.includes("P2002")
      ) {
        throw new CalendarDomainError(
          "APPOINTMENT_CONFLICT",
          "This appointment slot was just booked by another patient. Please select another time.",
        );
      }
      throw txErr;
    }

    // 8. Synchronize to Google Calendar
    let googleCalendarEventId: string | undefined = undefined;
    try {
      const calEvent = await GoogleCalendarService.createEvent({
        organizationId,
        dentistId: resolvedDentistId,
        title: `${service.name} - ${patientName}`,
        description: `Patient: ${patientName} (${patientPhone}, ${patientEmail})\nService: ${service.name}\nReference: ${reference}\nSource: ${source}\nNotes: ${notes || "None"}`,
        startTime: start,
        endTime: end,
        attendeeEmail: patientEmail,
        attendeeName: patientName,
      });

      if (calEvent.syncStatus === "synced" && calEvent.eventId) {
        googleCalendarEventId = calEvent.eventId;
        await db.appointment.update({
          where: { id: appointment.id },
          data: { googleCalendarEventId: calEvent.eventId },
        });
      }
    } catch (googleErr) {
      console.warn(
        `[SchedulingService] Google Calendar synchronization error for appt ${appointment.id}:`,
        googleErr,
      );
      // Notice: If Google Calendar sync failed because Google API error, do we cancel the DB booking?
      // Requirement 28: "The final state must never falsely report a successful booking if business rules require both systems to succeed. Possible approach: Create Google event, Finalize appointment, or safe compensation."
      // If the clinic is connected to Google Calendar and event creation throws GOOGLE_CALENDAR_API_ERROR,
      // compensate by cancelling or deleting the DB appointment:
      const connection = await db.googleCalendarConnection.findUnique({
        where: { organizationId },
      });
      if (
        connection &&
        connection.status === "CONNECTED" &&
        connection.calendarId
      ) {
        // Strict consistency: roll back the appointment
        await db.appointment.delete({ where: { id: appointment.id } });
        throw new CalendarDomainError(
          "GOOGLE_CALENDAR_API_ERROR",
          "Appointment booking failed: Could not synchronize with the clinic's Google Calendar.",
        );
      }
    }

    return {
      success: true,
      reference: appointment.reference,
      appointmentId: appointment.id,
      patientName,
      serviceName: service.name,
      dentistName,
      startTimeFormatted: formatTimeDisplay(start, timezone),
      endTimeFormatted: formatTimeDisplay(end, timezone),
      timezone,
      calendarEventId: googleCalendarEventId,
    };
  }

  /**
   * Cancels an appointment after strictly verifying patient identity and multi-tenant isolation.
   */
  public static async cancelAppointment(
    input: CancelAppointmentInput,
  ): Promise<{ success: boolean; reference: string; message: string }> {
    const { organizationId, reference, patientEmail, patientPhone, reason } =
      input;

    const appointment = await db.appointment.findFirst({
      where: {
        reference: reference.toUpperCase().trim(),
        organizationId,
      },
    });

    if (!appointment) {
      throw new CalendarDomainError(
        "APPOINTMENT_NOT_FOUND",
        `No appointment found with reference "${reference}".`,
      );
    }

    if (appointment.status === "CANCELLED") {
      return {
        success: true,
        reference: appointment.reference,
        message: "This appointment has already been cancelled.",
      };
    }

    // Patient verification: email or phone must match if provided
    if (patientEmail || patientPhone) {
      const emailMatches = Boolean(
        patientEmail &&
        appointment.patientEmail.toLowerCase().trim() ===
          patientEmail.toLowerCase().trim(),
      );
      const phoneMatches = Boolean(
        patientPhone &&
        appointment.patientPhone.replace(/\D/g, "") ===
          patientPhone.replace(/\D/g, ""),
      );

      if (!emailMatches && !phoneMatches) {
        throw new CalendarDomainError(
          "APPOINTMENT_NOT_FOUND",
          "Verification failed: Patient email or phone does not match the booking records.",
        );
      }
    }

    await db.appointment.update({
      where: { id: appointment.id },
      data: {
        status: "CANCELLED",
        notes: reason
          ? `${appointment.notes || ""}\nCancellation Reason: ${reason}`.trim()
          : appointment.notes,
      },
    });

    // Remove from Google Calendar if event was created
    if (appointment.googleCalendarEventId) {
      await GoogleCalendarService.deleteEvent({
        organizationId,
        eventId: appointment.googleCalendarEventId,
      }).catch((err) =>
        console.warn("[SchedulingService] Google event deletion warning:", err),
      );
    }

    return {
      success: true,
      reference: appointment.reference,
      message: `Appointment ${appointment.reference} for ${appointment.patientName} has been cancelled successfully.`,
    };
  }

  /**
   * Reschedules an existing appointment to a new verified time slot.
   */
  public static async rescheduleAppointment(
    input: RescheduleAppointmentInput,
  ): Promise<BookingResult> {
    const {
      organizationId,
      reference,
      patientEmail,
      patientPhone,
      newStartTime,
      newDentistId,
    } = input;

    const appointment = await db.appointment.findFirst({
      where: {
        reference: reference.toUpperCase().trim(),
        organizationId,
      },
      include: { service: true, dentist: true, organization: true },
    });

    if (!appointment) {
      throw new CalendarDomainError(
        "APPOINTMENT_NOT_FOUND",
        `No appointment found with reference "${reference}".`,
      );
    }

    if (patientEmail || patientPhone) {
      const emailMatches = Boolean(
        patientEmail &&
        appointment.patientEmail.toLowerCase().trim() ===
          patientEmail.toLowerCase().trim(),
      );
      const phoneMatches = Boolean(
        patientPhone &&
        appointment.patientPhone.replace(/\D/g, "") ===
          patientPhone.replace(/\D/g, ""),
      );

      if (!emailMatches && !phoneMatches) {
        throw new CalendarDomainError(
          "APPOINTMENT_NOT_FOUND",
          "Verification failed: Patient email or phone does not match the booking records.",
        );
      }
    }

    const newStart = new Date(newStartTime);
    if (isNaN(newStart.getTime())) {
      throw new CalendarDomainError(
        "CALENDAR_AVAILABILITY_UNAVAILABLE",
        "Invalid new appointment time.",
      );
    }
    const newEnd = new Date(
      newStart.getTime() + appointment.service.durationMinutes * 60 * 1000,
    );

    const resolvedDentistId =
      newDentistId || appointment.dentistId || undefined;

    // FINAL availability check on new slot
    const isFree = await this.verifySlotAvailable({
      organizationId,
      dentistId: resolvedDentistId,
      startTime: newStart,
      endTime: newEnd,
      excludeAppointmentId: appointment.id,
    });

    if (!isFree) {
      throw new CalendarDomainError(
        "APPOINTMENT_CONFLICT",
        "The requested reschedule slot is not available. Please choose another time.",
      );
    }

    // Update appointment in DB
    const updated = await db.appointment.update({
      where: { id: appointment.id },
      data: {
        startTime: newStart,
        endTime: newEnd,
        dentistId: resolvedDentistId,
        status: "CONFIRMED",
      },
      include: {
        organization: { select: { timezone: true } },
        dentist: { select: { name: true } },
      },
    });

    // Update Google Calendar event
    if (appointment.googleCalendarEventId) {
      await GoogleCalendarService.updateEvent({
        organizationId,
        eventId: appointment.googleCalendarEventId,
        startTime: newStart,
        endTime: newEnd,
      }).catch((err) =>
        console.warn("[SchedulingService] Google event update warning:", err),
      );
    }

    const timezone = updated.organization.timezone || "UTC";

    return {
      success: true,
      reference: updated.reference,
      appointmentId: updated.id,
      patientName: updated.patientName,
      serviceName: appointment.service.name,
      dentistName: updated.dentist?.name || "Clinic Staff",
      startTimeFormatted: formatTimeDisplay(newStart, timezone),
      endTimeFormatted: formatTimeDisplay(newEnd, timezone),
      timezone,
      calendarEventId: updated.googleCalendarEventId || undefined,
    };
  }
}
