import {
  SchedulingService,
  type CheckAvailabilityInput,
  type AvailableSlot,
  type AvailabilityResult,
  type BookAppointmentInput,
  type BookingResult,
  type CancelAppointmentInput,
  type RescheduleAppointmentInput,
} from "@/lib/calendar/scheduling-service";

export type {
  CheckAvailabilityInput,
  AvailableSlot,
  AvailabilityResult,
  BookAppointmentInput,
  BookingResult,
  CancelAppointmentInput,
  RescheduleAppointmentInput,
};

/**
 * AppointmentService delegates directly to the unified SchedulingService,
 * ensuring that AI Chat, AI Voice, and Staff Dashboard share the exact same
 * scheduling and availability algorithm.
 */
export class AppointmentService {
  public static async checkAvailability(
    input: CheckAvailabilityInput,
  ): Promise<AvailabilityResult> {
    return await SchedulingService.checkAvailability(input);
  }

  public static async bookAppointment(
    input: BookAppointmentInput,
  ): Promise<BookingResult> {
    return await SchedulingService.bookAppointment(input);
  }

  public static async cancelAppointment(
    input: CancelAppointmentInput,
  ): Promise<{ success: boolean; reference: string; message: string }> {
    return await SchedulingService.cancelAppointment(input);
  }

  public static async rescheduleAppointment(
    input: RescheduleAppointmentInput,
  ): Promise<BookingResult> {
    return await SchedulingService.rescheduleAppointment(input);
  }

  public static async verifySlotAvailable(params: {
    organizationId: string;
    dentistId?: string;
    startTime: Date;
    endTime: Date;
    excludeAppointmentId?: string;
  }): Promise<boolean> {
    return await SchedulingService.verifySlotAvailable(params);
  }
}
