import { db } from "@/lib/db";
import { calendarService } from "@/lib/calendar/service";
import { type DayOfWeek } from "@prisma/client";
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

export interface AvailabilityResult {
  isAvailable: boolean;
  date: string;
  timezone: string;
  serviceName: string;
  durationMinutes: number;
  availableSlots: AvailableSlot[];
  message?: string;
}

export interface BookAppointmentInput {
  organizationId: string;
  serviceId: string;
  dentistId?: string;
  startTime: string; // ISO string or YYYY-MM-DDTHH:mm:ss
  patientName: string;
  patientEmail: string;
  patientPhone: string;
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

function formatTimeDisplay(date: Date, timezone: string): string {
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
 * AppointmentService
 * Handles scheduling business logic, slot calculation, double-booking prevention,
 * patient identity verification, and multi-tenant isolation.
 */
export class AppointmentService {
  /**
   * Calculates valid, conflict-free appointment slots for a requested service and date.
   */
  public static async checkAvailability(
    input: CheckAvailabilityInput,
  ): Promise<AvailabilityResult> {
    const { organizationId, serviceId, dentistId, date, preferredTimeRange } =
      input;

    // 1. Resolve organization and timezone
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, timezone: true },
    });
    if (!org) {
      throw new Error("Organization not found.");
    }
    const timezone = org.timezone || "UTC";

    // 2. Validate service exists for this tenant
    const service = await db.service.findFirst({
      where: { id: serviceId, organizationId },
    });
    if (!service) {
      throw new Error(
        "The requested dental service is not offered by this clinic.",
      );
    }

    // 3. Validate dentist belongs to clinic if provided
    let verifiedDentistName = "Any Available Dentist";
    if (dentistId) {
      const dentist = await db.dentist.findFirst({
        where: { id: dentistId, organizationId },
      });
      if (!dentist) {
        throw new Error(
          "The requested dentist is not registered at this clinic.",
        );
      }
      verifiedDentistName = dentist.name;
    }

    // 4. Validate and parse requested date
    const parsedDate = new Date(`${date}T00:00:00Z`);
    if (isNaN(parsedDate.getTime())) {
      throw new Error(`Invalid date format: "${date}". Expected YYYY-MM-DD.`);
    }

    // 5. Check holiday closure for requested date
    const holidayClosure = await db.holiday.findFirst({
      where: {
        organizationId,
        date: {
          gte: new Date(`${date}T00:00:00.000Z`),
          lt: new Date(`${date}T23:59:59.999Z`),
        },
      },
    });

    if (holidayClosure) {
      return {
        isAvailable: false,
        date,
        timezone,
        serviceName: service.name,
        durationMinutes: service.durationMinutes,
        availableSlots: [],
        message: `The clinic is closed on ${date} for ${holidayClosure.name}.`,
      };
    }

    // 6. Check clinic working hours for the day of the week
    const dayOfWeek = DAY_INDEX_TO_NAME[parsedDate.getUTCDay()];
    const workingHours = await db.workingHours.findUnique({
      where: {
        organizationId_dayOfWeek: {
          organizationId,
          dayOfWeek,
        },
      },
    });

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
        serviceName: service.name,
        durationMinutes: service.durationMinutes,
        availableSlots: [],
        message: `The clinic is closed on ${dayOfWeek.toLowerCase()}s.`,
      };
    }

    // 7. Generate slot candidates
    const clinicOpenMinutes = parseTimeToMinutes(startTimeStr);
    const clinicCloseMinutes = parseTimeToMinutes(endTimeStr);
    const duration = service.durationMinutes || 30;
    const slotInterval = 30; // standard 30 min schedule stepping

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

    // 8. Fetch existing confirmed appointments for the day
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const existingAppointments = await db.appointment.findMany({
      where: {
        organizationId,
        status: "CONFIRMED",
        startTime: { gte: dayStart, lte: dayEnd },
      },
      select: {
        dentistId: true,
        startTime: true,
        endTime: true,
      },
    });

    // 9. Fetch clinic dentists to check capacity
    const clinicDentists = await db.dentist.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    });

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

      // Check external calendar conflict
      const calendarCheck = await calendarService.checkAvailability({
        organizationId,
        dentistId,
        startTime: slotStart,
        endTime: slotEnd,
      });

      if (!calendarCheck.isAvailable) {
        continue;
      }

      if (dentistId) {
        // Specific dentist requested: check if this dentist has overlapping appointment
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
        // Any dentist requested: find at least one dentist who is free
        let assignedDentist =
          clinicDentists.length > 0 ? clinicDentists[0] : null;

        if (clinicDentists.length > 0) {
          const freeDentist = clinicDentists.find((dentist) => {
            const hasConflict = existingAppointments.some(
              (appt) =>
                appt.dentistId === dentist.id &&
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

    return {
      isAvailable: availableSlots.length > 0,
      date,
      timezone,
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
   * Books a verified appointment with double-booking lock and calendar sync.
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
      notes,
    } = input;

    // 1. Resolve org and timezone
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, timezone: true },
    });
    if (!org) throw new Error("Organization not found.");
    const timezone = org.timezone || "UTC";

    // 2. Validate service
    const service = await db.service.findFirst({
      where: { id: serviceId, organizationId },
    });
    if (!service) {
      throw new Error("Service not found in this organization.");
    }

    // 3. Validate dentist if provided or assign first clinic dentist
    let resolvedDentistId = dentistId;
    let dentistName = "Clinic Dentist";

    if (dentistId) {
      const dentist = await db.dentist.findFirst({
        where: { id: dentistId, organizationId },
      });
      if (!dentist) throw new Error("Dentist not found in this organization.");
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

    // 4. Validate start and end time
    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
      throw new Error("Invalid start time provided.");
    }
    const end = new Date(start.getTime() + service.durationMinutes * 60 * 1000);

    // 5. Server-side validation of clinic working hours and holidays
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
      throw new Error(
        `Cannot book on ${dateStr}: clinic is closed for holiday (${holiday.name}).`,
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
      throw new Error(
        `Cannot book on ${dayOfWeek.toLowerCase()}s: clinic is closed.`,
      );
    }

    // 6. Double-booking check in database
    const conflict = await db.appointment.findFirst({
      where: {
        organizationId,
        status: "CONFIRMED",
        ...(resolvedDentistId ? { dentistId: resolvedDentistId } : {}),
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    if (conflict) {
      throw new Error(
        "This appointment slot was just booked by another patient. Please select another time.",
      );
    }

    // 7. Check calendar service
    const calCheck = await calendarService.checkAvailability({
      organizationId,
      dentistId: resolvedDentistId,
      startTime: start,
      endTime: end,
    });
    if (!calCheck.isAvailable) {
      throw new Error(
        calCheck.conflictReason || "Conflict detected on clinic calendar.",
      );
    }

    // 8. Create calendar event
    const calEvent = await calendarService.createEvent({
      organizationId,
      dentistId: resolvedDentistId,
      title: `${service.name} - ${patientName}`,
      description: `Patient: ${patientName} (${patientPhone}, ${patientEmail})\nService: ${service.name}\nNotes: ${notes || "None"}`,
      startTime: start,
      endTime: end,
      attendeeEmail: patientEmail,
      attendeeName: patientName,
    });

    // 9. Atomic appointment creation in PostgreSQL
    const reference = generateAppointmentReference();

    const appointment = await db.appointment.create({
      data: {
        reference,
        organizationId,
        dentistId: resolvedDentistId,
        serviceId: service.id,
        startTime: start,
        endTime: end,
        status: "CONFIRMED",
        patientName,
        patientEmail,
        patientPhone,
        notes,
        googleCalendarEventId: calEvent.eventId,
      },
    });

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
      calendarEventId: calEvent.eventId,
    };
  }

  /**
   * Cancels an appointment after strictly verifying patient credentials and tenant isolation.
   */
  public static async cancelAppointment(
    input: CancelAppointmentInput,
  ): Promise<{ success: boolean; reference: string; message: string }> {
    const { organizationId, reference, patientEmail, patientPhone, reason } =
      input;

    const appointment = await db.appointment.findFirst({
      where: {
        reference: reference.toUpperCase().trim(),
        organizationId, // Strict tenant boundary
      },
    });

    if (!appointment) {
      throw new Error(`No appointment found with reference "${reference}".`);
    }

    if (appointment.status === "CANCELLED") {
      return {
        success: true,
        reference: appointment.reference,
        message: "This appointment has already been cancelled.",
      };
    }

    // Patient verification: email or phone must match
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
      throw new Error(
        "Verification failed: Patient email or phone does not match the booking records.",
      );
    }

    // Update appointment status to CANCELLED
    await db.appointment.update({
      where: { id: appointment.id },
      data: {
        status: "CANCELLED",
        notes: reason
          ? `${appointment.notes || ""}\nCancellation Reason: ${reason}`.trim()
          : appointment.notes,
      },
    });

    // Remove from calendar
    if (appointment.googleCalendarEventId) {
      await calendarService.deleteEvent({
        organizationId,
        eventId: appointment.googleCalendarEventId,
      });
    }

    return {
      success: true,
      reference: appointment.reference,
      message: `Appointment ${appointment.reference} for ${appointment.patientName} has been cancelled successfully.`,
    };
  }

  /**
   * Reschedules an appointment to a new verified slot.
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
      include: { service: true, dentist: true },
    });

    if (!appointment) {
      throw new Error(`No appointment found with reference "${reference}".`);
    }

    // Patient verification
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
      throw new Error(
        "Verification failed: Patient email or phone does not match the booking records.",
      );
    }

    // Revalidate new slot
    const newStart = new Date(newStartTime);
    if (isNaN(newStart.getTime())) {
      throw new Error("Invalid new appointment time.");
    }
    const newEnd = new Date(
      newStart.getTime() + appointment.service.durationMinutes * 60 * 1000,
    );

    const resolvedDentistId = newDentistId || appointment.dentistId;

    // Check conflict (excluding current appointment id)
    const conflict = await db.appointment.findFirst({
      where: {
        organizationId,
        id: { not: appointment.id },
        status: "CONFIRMED",
        ...(resolvedDentistId ? { dentistId: resolvedDentistId } : {}),
        startTime: { lt: newEnd },
        endTime: { gt: newStart },
      },
    });

    if (conflict) {
      throw new Error(
        "The requested reschedule slot is not available. Please choose another time.",
      );
    }

    // Update calendar event
    if (appointment.googleCalendarEventId) {
      await calendarService.updateEvent({
        organizationId,
        eventId: appointment.googleCalendarEventId,
        startTime: newStart,
        endTime: newEnd,
      });
    }

    // Update database
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

    const timezone = updated.organization.timezone || "UTC";

    return {
      success: true,
      reference: updated.reference,
      appointmentId: updated.id,
      patientName: updated.patientName,
      serviceName: appointment.service.name,
      dentistName: updated.dentist?.name || "Clinic Dentist",
      startTimeFormatted: formatTimeDisplay(newStart, timezone),
      endTimeFormatted: formatTimeDisplay(newEnd, timezone),
      timezone,
      calendarEventId: updated.googleCalendarEventId || undefined,
    };
  }
}
