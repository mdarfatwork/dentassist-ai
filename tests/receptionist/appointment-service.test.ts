import assert from "node:assert";
import { db } from "@/lib/db";
import { AppointmentService } from "@/lib/appointment/service";
import { ClinicService } from "@/lib/clinic/service";

export async function runAppointmentServiceTests() {
  console.log("▶ Running AppointmentService & Scheduling tests...");

  // 1. Setup two test organizations to verify multi-tenant isolation
  const testOrgAId = `test_org_sched_a_${Date.now()}`;
  const testOrgBId = `test_org_sched_b_${Date.now()}`;

  await db.organization.createMany({
    data: [
      {
        id: testOrgAId,
        name: "Apex Dental Studio",
        slug: `apex-dental-${Date.now()}`,
        timezone: "America/New_York",
      },
      {
        id: testOrgBId,
        name: "Zenith Orthodontics",
        slug: `zenith-ortho-${Date.now()}`,
        timezone: "Asia/Kolkata",
      },
    ],
  });

  try {
    // 2. Setup services for each organization
    const serviceA = await db.service.create({
      data: {
        organizationId: testOrgAId,
        name: "Dental Cleaning",
        durationMinutes: 30,
      },
    });

    const serviceB = await db.service.create({
      data: {
        organizationId: testOrgBId,
        name: "Orthodontic Consultation",
        durationMinutes: 60,
      },
    });

    // 3. Setup working hours for Org A (open Monday 09:00 - 17:00)
    await db.workingHours.create({
      data: {
        organizationId: testOrgAId,
        dayOfWeek: "MONDAY",
        isOpen: true,
        startTime: "09:00",
        endTime: "17:00",
      },
    });

    // Setup working hours for Org A (closed Sunday)
    await db.workingHours.create({
      data: {
        organizationId: testOrgAId,
        dayOfWeek: "SUNDAY",
        isOpen: false,
      },
    });

    // 4. Test Availability on a closed day (Sunday: 2026-09-20 is a Sunday)
    const sundayAvailability = await AppointmentService.checkAvailability({
      organizationId: testOrgAId,
      serviceId: serviceA.id,
      date: "2026-09-20",
    });

    assert.strictEqual(
      sundayAvailability.isAvailable,
      false,
      "Sunday availability must be false when clinic is closed on Sundays",
    );
    assert.strictEqual(
      sundayAvailability.availableSlots.length,
      0,
      "Available slots count on closed day must be 0",
    );
    console.log("  ✔ Closed day working hours check passed.");

    // 5. Test Holiday Closure (Monday: 2026-09-21 is a Monday, add a holiday for it)
    await db.holiday.create({
      data: {
        organizationId: testOrgAId,
        name: "Staff Training Day",
        date: new Date("2026-09-21T00:00:00.000Z"),
      },
    });

    const holidayAvailability = await AppointmentService.checkAvailability({
      organizationId: testOrgAId,
      serviceId: serviceA.id,
      date: "2026-09-21",
    });

    assert.strictEqual(
      holidayAvailability.isAvailable,
      false,
      "Availability on a declared holiday must be false",
    );
    assert(
      holidayAvailability.message?.includes("Staff Training Day"),
      "Message must explain clinic closure for the specific holiday",
    );
    console.log("  ✔ Holiday closure check passed.");

    // 6. Test Multi-Tenant Cross-Access Isolation
    // Org A cannot check availability using Org B's serviceId
    await assert.rejects(
      async () => {
        await AppointmentService.checkAvailability({
          organizationId: testOrgAId,
          serviceId: serviceB.id, // Org B's service
          date: "2026-09-28", // Monday
        });
      },
      /The requested dental service is not offered by this clinic/,
      "Tenant boundary must prevent querying another organization's service",
    );
    console.log("  ✔ Cross-tenant service access rejection passed.");

    // 7. Test Successful Availability Calculation
    // Monday: 2026-09-28 (Normal working hours 09:00 - 17:00, 30 min duration)
    const mondaySlots = await AppointmentService.checkAvailability({
      organizationId: testOrgAId,
      serviceId: serviceA.id,
      date: "2026-09-28",
      preferredTimeRange: { start: "09:00", end: "11:00" },
    });

    assert.strictEqual(
      mondaySlots.isAvailable,
      true,
      "Slots should be available during open business hours",
    );
    assert(
      mondaySlots.availableSlots.length > 0,
      "Slots should be generated for the preferred window",
    );
    console.log(
      `  ✔ Slot calculation passed (found ${mondaySlots.availableSlots.length} slots).`,
    );

    // 8. Test Booking Appointment
    const chosenSlot = mondaySlots.availableSlots[0];
    const booking = await AppointmentService.bookAppointment({
      organizationId: testOrgAId,
      serviceId: serviceA.id,
      startTime: chosenSlot.startTime,
      patientName: "Arfat Test",
      patientEmail: "arfat@example.com",
      patientPhone: "+15551234567",
      notes: "Routine 6-month cleaning",
    });

    assert.strictEqual(booking.success, true, "Booking must succeed");
    assert(
      booking.reference.startsWith("DA-"),
      "Reference must follow DA-XXXXX format",
    );
    assert.strictEqual(booking.patientName, "Arfat Test");
    console.log(
      `  ✔ Appointment booking passed (Reference: ${booking.reference}).`,
    );

    // 9. Test Double-Booking Prevention (Same slot booking attempt must fail)
    await assert.rejects(
      async () => {
        await AppointmentService.bookAppointment({
          organizationId: testOrgAId,
          serviceId: serviceA.id,
          startTime: chosenSlot.startTime,
          patientName: "Concurrent Patient",
          patientEmail: "concurrent@example.com",
          patientPhone: "+15559876543",
        });
      },
      /This appointment slot was just booked by another patient/,
      "Double-booking must be rejected when attempting to book an occupied slot",
    );
    console.log("  ✔ Double-booking prevention check passed.");

    // 10. Test Cancellation with Wrong Patient Credentials (Verification Failure)
    await assert.rejects(
      async () => {
        await AppointmentService.cancelAppointment({
          organizationId: testOrgAId,
          reference: booking.reference,
          patientEmail: "imposter@example.com",
          patientPhone: "+15550000000",
        });
      },
      /Verification failed: Patient email or phone does not match/,
      "Cancellation must fail when patient email/phone does not match records",
    );
    console.log("  ✔ Cancellation identity verification check passed.");

    // 11. Test Cross-Tenant Cancellation Isolation (Org B cannot cancel Org A's appointment)
    await assert.rejects(
      async () => {
        await AppointmentService.cancelAppointment({
          organizationId: testOrgBId, // Org B trying to cancel Org A's appointment
          reference: booking.reference,
          patientEmail: "arfat@example.com",
        });
      },
      /No appointment found with reference/,
      "Organization B must not be able to find or cancel Organization A's appointment",
    );
    console.log("  ✔ Cross-tenant cancellation isolation passed.");

    // 12. Test Valid Cancellation
    const cancelResult = await AppointmentService.cancelAppointment({
      organizationId: testOrgAId,
      reference: booking.reference,
      patientEmail: "arfat@example.com",
      reason: "Scheduling conflict",
    });

    assert.strictEqual(cancelResult.success, true);

    const cancelledInDb = await db.appointment.findFirst({
      where: { reference: booking.reference },
    });
    assert.strictEqual(cancelledInDb?.status, "CANCELLED");
    console.log("  ✔ Valid cancellation passed.");

    // 13. Test Structured ClinicService queries
    const clinicInfo = await ClinicService.getClinicInfo(testOrgAId);
    assert.strictEqual(clinicInfo?.name, "Apex Dental Studio");
    assert.strictEqual(clinicInfo?.timezone, "America/New_York");

    const clinicHours = await ClinicService.getClinicHours(testOrgAId);
    assert.strictEqual(clinicHours.timezone, "America/New_York");
    assert(clinicHours.weeklySchedule.length === 7);
    console.log("  ✔ Structured ClinicService queries passed.");
  } finally {
    // Cleanup test data
    await db.conversationMessage.deleteMany({
      where: {
        conversation: {
          organizationId: { in: [testOrgAId, testOrgBId] },
        },
      },
    });
    await db.conversation.deleteMany({
      where: { organizationId: { in: [testOrgAId, testOrgBId] } },
    });
    await db.appointment.deleteMany({
      where: { organizationId: { in: [testOrgAId, testOrgBId] } },
    });
    await db.holiday.deleteMany({
      where: { organizationId: { in: [testOrgAId, testOrgBId] } },
    });
    await db.workingHours.deleteMany({
      where: { organizationId: { in: [testOrgAId, testOrgBId] } },
    });
    await db.service.deleteMany({
      where: { organizationId: { in: [testOrgAId, testOrgBId] } },
    });
    await db.organization.deleteMany({
      where: { id: { in: [testOrgAId, testOrgBId] } },
    });
  }
}
