import assert from "node:assert";
import { db } from "@/lib/db";
import { ReceptionistWorkflowCoordinator } from "@/lib/receptionist/workflow";
import {
  resolveDateReference,
  resolveTimePreference,
  getNowInTimezone,
} from "@/lib/receptionist/date-resolver";
import { type BookingState } from "@/lib/receptionist/types";

export async function runDeterministicWorkflowTests() {
  console.log("▶ Running Deterministic Workflow & Timezone tests...");

  // ---------------------------------------------------------------------------
  // 1. Test Server-Side Timezone Resolution
  // ---------------------------------------------------------------------------
  const kolkataNow = getNowInTimezone("Asia/Kolkata");
  assert(
    kolkataNow.year >= 2026,
    "Timezone calculation must return valid year",
  );
  assert(kolkataNow.month >= 1 && kolkataNow.month <= 12);
  assert(kolkataNow.day >= 1 && kolkataNow.day <= 31);

  const tomorrowKolkata = resolveDateReference("tomorrow", "Asia/Kolkata");
  assert(
    /^\d{4}-\d{2}-\d{2}$/.test(tomorrowKolkata.dateStr),
    "Date format must strictly be YYYY-MM-DD",
  );
  assert(tomorrowKolkata.displayDate.length > 0);

  const todayChicago = resolveDateReference("today", "America/Chicago");
  assert(/^\d{4}-\d{2}-\d{2}$/.test(todayChicago.dateStr));

  const morningPref = resolveTimePreference({ type: "morning" });
  assert.strictEqual(morningPref?.start, "08:00");
  assert.strictEqual(morningPref?.end, "12:00");

  const afternoonPref = resolveTimePreference({ type: "afternoon" });
  assert.strictEqual(afternoonPref?.start, "12:00");
  assert.strictEqual(afternoonPref?.end, "17:00");

  const exactPref = resolveTimePreference({
    type: "exact",
    value: "10:30 am",
  });
  assert.strictEqual(exactPref?.start, "10:30");
  assert.strictEqual(exactPref?.end, "12:30");
  console.log("  ✔ Server-side relative date & timezone resolution passed.");

  // ---------------------------------------------------------------------------
  // 2. Setup Test Organization & Data
  // ---------------------------------------------------------------------------
  const testOrgId = `test_org_wf_${Date.now()}`;
  await db.organization.create({
    data: {
      id: testOrgId,
      name: "Summit Family Dental",
      slug: `summit-dental-${Date.now()}`,
      phone: "+1 (555) 444-3322",
      email: "care@summitdental.com",
      timezone: "America/Chicago",
      dentists: {
        create: [
          {
            name: "Dr. Sarah Mitchell",
            specialization: "General Dentistry",
          },
        ],
      },
      services: {
        create: [
          {
            name: "Dental Cleaning",
            durationMinutes: 30,
            description: "Routine oral prophylaxis",
          },
        ],
      },
      workingHours: {
        createMany: {
          data: [
            {
              dayOfWeek: "MONDAY",
              isOpen: true,
              startTime: "09:00",
              endTime: "17:00",
            },
            {
              dayOfWeek: "TUESDAY",
              isOpen: true,
              startTime: "09:00",
              endTime: "17:00",
            },
            {
              dayOfWeek: "WEDNESDAY",
              isOpen: true,
              startTime: "09:00",
              endTime: "17:00",
            },
            {
              dayOfWeek: "THURSDAY",
              isOpen: true,
              startTime: "09:00",
              endTime: "17:00",
            },
            {
              dayOfWeek: "FRIDAY",
              isOpen: true,
              startTime: "09:00",
              endTime: "17:00",
            },
            { dayOfWeek: "SATURDAY", isOpen: false },
            { dayOfWeek: "SUNDAY", isOpen: false },
          ],
        },
      },
    },
  });

  try {
    const services = await db.service.findMany({
      where: { organizationId: testOrgId },
    });
    const cleaningService = services.find((s) => s.name === "Dental Cleaning")!;

    // -------------------------------------------------------------------------
    // 3. Test Multi-Turn State Retention & Safe Booking Flow
    // -------------------------------------------------------------------------

    // Turn 1: Availability inquiry with service
    // "I want cleaning, check available slots"
    const turn1State: BookingState = {
      serviceId: cleaningService.id,
      serviceName: cleaningService.name,
      requestedDate: "2026-09-22", // A Tuesday
      dateDisplay: "Tuesday, September 22, 2026",
    };

    const turn1Result = await ReceptionistWorkflowCoordinator.execute({
      organizationId: testOrgId,
      conversationId: "test_convo_1",
      message: "I want cleaning, check available slots for tomorrow",
      bookingState: turn1State,
      historyMessages: [],
    });

    assert(
      turn1Result.bookingState.lastOfferedSlots !== undefined &&
        turn1Result.bookingState.lastOfferedSlots.length > 0,
      "Available slots must be returned and saved in state",
    );
    assert.strictEqual(
      turn1Result.bookingState.status,
      "awaiting_slot_selection",
      "Status must transition to awaiting_slot_selection",
    );
    assert.strictEqual(
      turn1Result.bookingState.serviceId,
      cleaningService.id,
      "Service ID must be preserved in state",
    );
    console.log("  ✔ Turn 1: Availability check & slot generation passed.");

    // Turn 2: Slot selection ("I'll take the first one")
    const offeredFirstSlot = turn1Result.bookingState.lastOfferedSlots![0];
    const turn2Result = await ReceptionistWorkflowCoordinator.execute({
      organizationId: testOrgId,
      conversationId: "test_convo_1",
      message: "I will take the first one",
      bookingState: turn1Result.bookingState,
      historyMessages: [
        { role: "user", content: "I want cleaning, check available slots" },
        { role: "assistant", content: turn1Result.reply },
      ],
    });

    assert.strictEqual(
      turn2Result.bookingState.selectedStartTime,
      offeredFirstSlot.startTime,
      "Selected slot start time must match the first offered slot",
    );
    assert.strictEqual(
      turn2Result.bookingState.serviceId,
      cleaningService.id,
      "Service ID must be strictly preserved without re-prompting",
    );
    assert.strictEqual(
      turn2Result.bookingState.status,
      "awaiting_patient_details",
      "Workflow must prompt for missing patient contact details",
    );
    assert(
      turn2Result.reply.includes("Full Name") &&
        turn2Result.reply.includes("Email Address") &&
        turn2Result.reply.includes("Phone Number"),
      "Response must list the missing required contact fields",
    );
    console.log("  ✔ Turn 2: Slot selection & contact details intake passed.");

    // Turn 3: Patient provides contact information
    const turn3State: BookingState = {
      ...turn2Result.bookingState,
      patientName: "Jane Doe",
      patientEmail: "jane.doe@example.com",
      patientPhone: "+1 (555) 987-6543",
    };

    const turn3Result = await ReceptionistWorkflowCoordinator.execute({
      organizationId: testOrgId,
      conversationId: "test_convo_1",
      message:
        "My name is Jane Doe, email jane.doe@example.com, phone 555-987-6543",
      bookingState: turn3State,
      historyMessages: [
        { role: "user", content: "I will take the first one" },
        { role: "assistant", content: turn2Result.reply },
      ],
    });

    assert.strictEqual(
      turn3Result.bookingState.status,
      "awaiting_confirmation",
      "When slot and contact details are present, state must advance to awaiting_confirmation",
    );
    assert.strictEqual(
      turn3Result.bookingState.confirmationPending,
      true,
      "Explicit confirmation must be required",
    );
    assert(
      turn3Result.reply.includes("confirm your appointment details") ||
        turn3Result.reply.includes("confirm"),
      "Assistant must ask for explicit confirmation before booking",
    );
    console.log(
      "  ✔ Turn 3: Summary display & explicit confirmation prompt passed.",
    );

    // Turn 4: User explicitly confirms ("Yes, book it")
    const turn4Result = await ReceptionistWorkflowCoordinator.execute({
      organizationId: testOrgId,
      conversationId: "test_convo_1",
      message: "Yes, please book it!",
      bookingState: turn3Result.bookingState,
      historyMessages: [
        { role: "user", content: "Jane Doe" },
        { role: "assistant", content: turn3Result.reply },
      ],
    });

    assert.strictEqual(
      turn4Result.bookingState.status,
      "completed",
      "State must transition to completed upon successful confirmation",
    );
    assert.strictEqual(
      turn4Result.bookingState.isConfirmed,
      true,
      "Appointment must be confirmed",
    );
    assert(
      turn4Result.bookingState.appointmentReference?.startsWith("DA-"),
      "Valid appointment reference must be assigned",
    );
    assert(
      turn4Result.reply.includes(
        turn4Result.bookingState.appointmentReference!,
      ),
      "Confirmation reply must contain official reference code",
    );

    // Verify appointment exists in database
    const dbAppointment = await db.appointment.findUnique({
      where: { reference: turn4Result.bookingState.appointmentReference! },
    });
    assert(
      dbAppointment !== null,
      "Appointment must be committed in PostgreSQL",
    );
    assert.strictEqual(dbAppointment.patientName, "Jane Doe");
    assert.strictEqual(dbAppointment.organizationId, testOrgId);
    console.log(
      "  ✔ Turn 4: Atomic confirmation & transactional booking passed.",
    );

    // -------------------------------------------------------------------------
    // 4. Test Double-Booking & Slot Conflict Prevention
    // -------------------------------------------------------------------------
    // Attempting to book the same slot again must be rejected with remaining slots
    const conflictState: BookingState = {
      status: "awaiting_confirmation",
      confirmationPending: true,
      serviceId: cleaningService.id,
      serviceName: cleaningService.name,
      requestedDate: "2026-09-22",
      selectedStartTime: offeredFirstSlot.startTime,
      selectedEndTime: offeredFirstSlot.endTime,
      selectedTimeDisplay: offeredFirstSlot.timeString,
      patientName: "Alice Smith",
      patientEmail: "alice@example.com",
      patientPhone: "+1 (555) 777-8899",
    };

    const conflictResult = await ReceptionistWorkflowCoordinator.execute({
      organizationId: testOrgId,
      conversationId: "test_convo_conflict",
      message: "Yes, book it",
      bookingState: conflictState,
      historyMessages: [],
    });

    assert(
      conflictResult.reply.includes("just booked") ||
        conflictResult.reply.includes("another patient") ||
        conflictResult.reply.includes("could not complete"),
      "Slot conflict must inform patient cleanly without crashing",
    );
    assert.strictEqual(
      conflictResult.bookingState.isConfirmed,
      undefined,
      "Conflicted slot must NOT be marked confirmed",
    );
    console.log("  ✔ Double-booking slot conflict safety check passed.");

    // -------------------------------------------------------------------------
    // 5. Test Negation in Confirmation State
    // -------------------------------------------------------------------------
    const negationState: BookingState = {
      status: "awaiting_confirmation",
      confirmationPending: true,
      serviceId: cleaningService.id,
      selectedStartTime: "2026-09-22T14:00:00.000Z",
      patientName: "Bob Jones",
      patientEmail: "bob@example.com",
      patientPhone: "+1 (555) 111-2222",
    };

    const negationResult = await ReceptionistWorkflowCoordinator.execute({
      organizationId: testOrgId,
      conversationId: "test_convo_negation",
      message: "No, cancel that",
      bookingState: negationState,
      historyMessages: [],
    });

    assert.strictEqual(
      negationResult.bookingState.confirmationPending,
      false,
      "Negation must clear confirmationPending",
    );
    assert(
      negationResult.reply.includes("cancelled the pending booking") ||
        negationResult.reply.includes("assist you"),
      "Assistant must acknowledge cancellation politely",
    );
    console.log("  ✔ Explicit booking rejection/negation passed.");

    // -------------------------------------------------------------------------
    // 6. Test Deterministic Slot Selection ("I will prefer the 9AM")
    // -------------------------------------------------------------------------
    const slotSelectionState: BookingState = {
      status: "awaiting_slot_selection",
      serviceId: cleaningService.id,
      serviceName: cleaningService.name,
      requestedDate: "2026-09-22",
      dateDisplay: "Tuesday, September 22, 2026",
      lastOfferedSlots: [
        {
          startTime: "2026-09-22T09:00:00.000Z",
          endTime: "2026-09-22T09:30:00.000Z",
          timeString: "09:00 AM",
        },
        {
          startTime: "2026-09-22T10:00:00.000Z",
          endTime: "2026-09-22T10:30:00.000Z",
          timeString: "10:00 AM",
        },
      ],
    };

    const slot9AmResult = await ReceptionistWorkflowCoordinator.execute({
      organizationId: testOrgId,
      conversationId: "test_convo_slot9am",
      message: "I will prefer the 9AM",
      bookingState: slotSelectionState,
      historyMessages: [],
    });

    assert.strictEqual(
      slot9AmResult.bookingState.selectedStartTime,
      "2026-09-22T09:00:00.000Z",
      "9AM phrase must deterministically match 09:00 AM offered slot without LLM call",
    );
    assert.strictEqual(
      slot9AmResult.bookingState.status,
      "awaiting_patient_details",
    );
    console.log(
      "  ✔ Deterministic slot selection with 'I will prefer the 9AM' passed.",
    );

    // -------------------------------------------------------------------------
    // 7. Test Deterministic Contact Info ("My Name is Smith, Email is smith@yopmail.com and number is +919876543210")
    // -------------------------------------------------------------------------
    const awaitingDetailsState: BookingState = {
      status: "awaiting_patient_details",
      serviceId: cleaningService.id,
      serviceName: cleaningService.name,
      selectedStartTime: "2026-09-22T09:00:00.000Z",
      selectedTimeDisplay: "09:00 AM",
      requestedDate: "2026-09-22",
    };

    const contactDetailsResult = await ReceptionistWorkflowCoordinator.execute({
      organizationId: testOrgId,
      conversationId: "test_convo_contact",
      message:
        "My Name is Smith, Email is smith@yopmail.com and number is +919876543210",
      bookingState: awaitingDetailsState,
      historyMessages: [],
    });

    assert.strictEqual(contactDetailsResult.bookingState.patientName, "Smith");
    assert.strictEqual(
      contactDetailsResult.bookingState.patientEmail,
      "smith@yopmail.com",
    );
    assert.strictEqual(
      contactDetailsResult.bookingState.patientPhone,
      "+919876543210",
    );
    assert.strictEqual(
      contactDetailsResult.bookingState.status,
      "awaiting_confirmation",
    );
    assert.strictEqual(
      contactDetailsResult.bookingState.confirmationPending,
      true,
    );
    console.log(
      "  ✔ Deterministic contact details intake with international phone passed.",
    );

    // -------------------------------------------------------------------------
    // 8. Test Deterministic Name Intake ("Full Name is Alex Smith")
    // -------------------------------------------------------------------------
    const nameIntakeState: BookingState = {
      status: "awaiting_patient_details",
      serviceId: cleaningService.id,
      selectedStartTime: "2026-09-22T09:00:00.000Z",
    };

    const nameResult = await ReceptionistWorkflowCoordinator.execute({
      organizationId: testOrgId,
      conversationId: "test_convo_name",
      message: "Full Name is Alex Smith",
      bookingState: nameIntakeState,
      historyMessages: [],
    });

    assert.strictEqual(nameResult.bookingState.patientName, "Alex Smith");
    console.log(
      "  ✔ Deterministic patient name intake with 'Full Name is Alex Smith' passed.",
    );
  } finally {
    // Cleanup
    await db.appointment.deleteMany({
      where: { organizationId: testOrgId },
    });
    await db.workingHours.deleteMany({
      where: { organizationId: testOrgId },
    });
    await db.dentist.deleteMany({
      where: { organizationId: testOrgId },
    });
    await db.service.deleteMany({
      where: { organizationId: testOrgId },
    });
    await db.organization.delete({
      where: { id: testOrgId },
    });
  }
}
