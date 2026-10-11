import assert from "node:assert";
import { db } from "@/lib/db";
import { encryptToken, decryptToken } from "@/lib/calendar/encryption";
import {
  createOAuthState,
  verifyOAuthState,
  saveGoogleCalendarConnection,
} from "@/lib/calendar/google-oauth";
import { GoogleCalendarService } from "@/lib/calendar/google-calendar-service";
import { SchedulingService } from "@/lib/calendar/scheduling-service";

export async function runPhase6Tests() {
  console.log("=======================================================");
  console.log("   DentAssist AI - Phase 6 Google Calendar & Scheduling Tests");
  console.log("=======================================================\n");

  const testOrgAId = `test_p6_org_a_${Date.now()}`;
  const testOrgBId = `test_p6_org_b_${Date.now()}`;
  const testUserId = `test_p6_user_${Date.now()}`;

  // 1. Setup Test Organizations & User
  await db.user.create({
    data: {
      id: testUserId,
      name: "Dr. Admin",
      email: `admin_${Date.now()}@testdental.com`,
    },
  });

  await db.organization.createMany({
    data: [
      {
        id: testOrgAId,
        name: "Prime Dental Care",
        slug: `prime-dental-${Date.now()}`,
        timezone: "America/Chicago",
      },
      {
        id: testOrgBId,
        name: "Beacon Ortho",
        slug: `beacon-ortho-${Date.now()}`,
        timezone: "Asia/Kolkata",
      },
    ],
  });

  await db.organizationMembership.createMany({
    data: [
      {
        userId: testUserId,
        organizationId: testOrgAId,
        role: "OWNER",
      },
      {
        userId: testUserId,
        organizationId: testOrgBId,
        role: "STAFF",
      },
    ],
  });

  try {
    // -------------------------------------------------------------------------
    // TEST SECTION 1: Token Encryption & Decryption (AES-256-GCM)
    // -------------------------------------------------------------------------
    console.log("▶ 1. Testing Token Encryption & Decryption (AES-256-GCM)...");
    const sampleToken =
      "ya29.a0AfH6SMD_very_secret_google_oauth_access_token_123456";
    const encrypted = encryptToken(sampleToken);

    assert(
      encrypted !== sampleToken,
      "Encrypted token must not match plaintext",
    );
    assert(
      encrypted.includes(":"),
      "Encrypted token must contain IV and AuthTag delimiters",
    );

    const decrypted = decryptToken(encrypted);
    assert.strictEqual(
      decrypted,
      sampleToken,
      "Decrypted token must exactly match plaintext",
    );

    // Test corrupted ciphertext rejection
    assert.throws(
      () => decryptToken("corrupted:token:format"),
      "Corrupted encrypted token must throw an error",
    );
    console.log(
      "  ✔ AES-256-GCM token encryption and tamper-resistance passed.",
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 2: OAuth State Creation & CSRF / Tenant Tampering Protection
    // -------------------------------------------------------------------------
    console.log("▶ 2. Testing OAuth State Generation & Validation...");
    const state = createOAuthState(testOrgAId, testUserId);
    assert(
      typeof state === "string" && state.length > 20,
      "State must be a signed string",
    );

    const verifiedPayload = verifyOAuthState(state, testUserId);
    assert.strictEqual(verifiedPayload.organizationId, testOrgAId);
    assert.strictEqual(verifiedPayload.userId, testUserId);

    // Reject wrong user verification
    assert.throws(
      () => verifyOAuthState(state, "wrong_user_id"),
      "State with user mismatch must be rejected",
    );

    // Reject tampered state
    const tampered = state.slice(0, -4) + "XXXX";
    assert.throws(
      () => verifyOAuthState(tampered),
      "Tampered state string must fail HMAC verification",
    );
    console.log(
      "  ✔ OAuth state cryptographic signing & CSRF protection passed.",
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 3: GoogleCalendarService Connection Status & Selection
    // -------------------------------------------------------------------------
    console.log("▶ 3. Testing Google Calendar Connection Lifecycle...");
    // Initial status for Org A: DISCONNECTED
    const initialStatus =
      await GoogleCalendarService.getConnectionStatus(testOrgAId);
    assert.strictEqual(initialStatus.status, "DISCONNECTED");
    assert.strictEqual(initialStatus.isConnected, false);

    // Store encrypted connection
    await saveGoogleCalendarConnection({
      organizationId: testOrgAId,
      accessToken: "access_token_p6_test",
      refreshToken: "refresh_token_p6_test",
      expiresInSeconds: 3600,
      scopes: "https://www.googleapis.com/auth/calendar.events",
      googleAccountEmail: "clinic@example.com",
    });

    const connectedStatus =
      await GoogleCalendarService.getConnectionStatus(testOrgAId);
    assert.strictEqual(connectedStatus.status, "CONNECTED");
    assert.strictEqual(
      connectedStatus.googleAccountEmail,
      "clinic@example.com",
    );
    assert.strictEqual(connectedStatus.isConnected, false); // false until calendar is explicitly selected

    // Select calendar
    await GoogleCalendarService.selectCalendar({
      organizationId: testOrgAId,
      calendarId: "c_dentassist_prime@group.calendar.google.com",
      calendarName: "Prime Dental Operatory 1",
    });

    const activeStatus =
      await GoogleCalendarService.getConnectionStatus(testOrgAId);
    assert.strictEqual(activeStatus.isConnected, true);
    assert.strictEqual(activeStatus.calendarName, "Prime Dental Operatory 1");

    // Disconnect
    await GoogleCalendarService.disconnect(testOrgAId);
    const disconnectedStatus =
      await GoogleCalendarService.getConnectionStatus(testOrgAId);
    assert.strictEqual(disconnectedStatus.status, "DISCONNECTED");
    assert.strictEqual(disconnectedStatus.calendarId, null);
    assert.strictEqual(disconnectedStatus.isConnected, false);
    console.log(
      "  ✔ Google Calendar connection & calendar selection lifecycle passed.",
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 4: Clinic Scheduling & Availability Computation
    // -------------------------------------------------------------------------
    console.log(
      "▶ 4. Testing Unified SchedulingService Availability Algorithm...",
    );
    // Setup Service & Dentists
    const serviceClean = await db.service.create({
      data: {
        organizationId: testOrgAId,
        name: "Teeth Whitening",
        durationMinutes: 60,
      },
    });

    const dentist1 = await db.dentist.create({
      data: {
        organizationId: testOrgAId,
        name: "Dr. Emily Hayes",
        specialization: "Cosmetic Dentistry",
      },
    });

    await db.dentist.create({
      data: {
        organizationId: testOrgAId,
        name: "Dr. Marcus Vance",
        specialization: "General Dentistry",
      },
    });

    // Working hours: Monday 09:00 - 17:00
    await db.workingHours.create({
      data: {
        organizationId: testOrgAId,
        dayOfWeek: "MONDAY",
        isOpen: true,
        startTime: "09:00",
        endTime: "17:00",
      },
    });

    // Closed on Sunday
    await db.workingHours.create({
      data: {
        organizationId: testOrgAId,
        dayOfWeek: "SUNDAY",
        isOpen: false,
      },
    });

    // Check Sunday: must be closed
    const sundayRes = await SchedulingService.checkAvailability({
      organizationId: testOrgAId,
      serviceId: serviceClean.id,
      date: "2026-09-20", // Sunday
    });
    assert.strictEqual(sundayRes.isAvailable, false);
    assert(sundayRes.message?.includes("closed on sundays"));

    // Check Monday: open with 60-min intervals
    const mondayRes = await SchedulingService.checkAvailability({
      organizationId: testOrgAId,
      serviceId: serviceClean.id,
      date: "2026-09-21", // Monday
    });
    assert.strictEqual(mondayRes.isAvailable, true);
    assert(
      mondayRes.availableSlots.length > 0,
      "Must find open slots for 60-min service",
    );

    // Check timezone formatting
    assert(
      mondayRes.availableSlots[0].timeString.includes("AM") ||
        mondayRes.availableSlots[0].timeString.includes("PM"),
      "Slot timeString must be formatted in clinic timezone",
    );
    console.log(
      "  ✔ Working hours, service duration, and timezone conversion passed.",
    );

    // Holiday check
    await db.holiday.create({
      data: {
        organizationId: testOrgAId,
        date: new Date("2026-09-28T00:00:00Z"),
        name: "Clinic Founder's Day",
      },
    });

    const holidayRes = await SchedulingService.checkAvailability({
      organizationId: testOrgAId,
      serviceId: serviceClean.id,
      date: "2026-09-28", // Monday with holiday closure
    });
    assert.strictEqual(holidayRes.isAvailable, false);
    assert(holidayRes.message?.includes("Clinic Founder's Day"));
    console.log("  ✔ Holiday closure availability exclusion passed.");

    // -------------------------------------------------------------------------
    // TEST SECTION 5: Double Booking Prevention & Concurrency Race Condition (Req 55)
    // -------------------------------------------------------------------------
    console.log(
      "▶ 5. Testing Concurrency Race Condition & Double-Booking Protection (Req 55)...",
    );
    const raceTargetStartTime = "2026-09-21T15:00:00.000Z";

    // Both Patient A and Patient B see slot 15:00 as available
    const initialCheck = await SchedulingService.checkAvailability({
      organizationId: testOrgAId,
      serviceId: serviceClean.id,
      dentistId: dentist1.id,
      date: "2026-09-21",
    });
    const has1500 = initialCheck.availableSlots.some(
      (s) => s.startTime === raceTargetStartTime,
    );
    assert(has1500, "15:00 slot must be initially available for both patients");

    // Patient A and Patient B confirm booking almost simultaneously!
    const results = await Promise.allSettled([
      SchedulingService.bookAppointment({
        organizationId: testOrgAId,
        serviceId: serviceClean.id,
        dentistId: dentist1.id,
        startTime: raceTargetStartTime,
        patientName: "Patient A (Race)",
        patientEmail: "patient_a@example.com",
        patientPhone: "+1 (555) 111-2222",
        source: "AI_CHAT",
      }),
      SchedulingService.bookAppointment({
        organizationId: testOrgAId,
        serviceId: serviceClean.id,
        dentistId: dentist1.id,
        startTime: raceTargetStartTime,
        patientName: "Patient B (Race)",
        patientEmail: "patient_b@example.com",
        patientPhone: "+1 (555) 333-4444",
        source: "AI_CHAT",
      }),
    ]);

    const fulfilledCount = results.filter(
      (r) => r.status === "fulfilled",
    ).length;
    const rejectedCount = results.filter((r) => r.status === "rejected").length;

    assert.strictEqual(
      fulfilledCount,
      1,
      `Exactly ONE booking must succeed in a concurrent race. Got: ${fulfilledCount}`,
    );
    assert.strictEqual(
      rejectedCount,
      1,
      `Exactly ONE booking must be rejected with conflict. Got: ${rejectedCount}`,
    );

    const successfulBooking = (
      results.find((r) => r.status === "fulfilled") as PromiseFulfilledResult<{
        reference: string;
      }>
    ).value;
    assert(successfulBooking.reference.startsWith("DA-"));

    const rejectedReason = (
      results.find((r) => r.status === "rejected") as PromiseRejectedResult
    ).reason;
    const reasonText = String(rejectedReason?.message || rejectedReason);
    assert(
      reasonText.toLowerCase().includes("booked") ||
        reasonText.toLowerCase().includes("conflict") ||
        reasonText.toLowerCase().includes("unavailable") ||
        reasonText.includes("Unique constraint"),
      `Rejected booking must cite conflict or unavailable slot. Got: ${reasonText}`,
    );
    console.log(
      "  ✔ Mandatory Concurrency Race Condition (Req 55) passed: Exactly 1 won, 1 rejected.",
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 6: Cancellation & Idempotency
    // -------------------------------------------------------------------------
    console.log("▶ 6. Testing Appointment Cancellation & Idempotency...");
    const apptRef = successfulBooking.reference;

    // Wrong patient email should fail
    await assert.rejects(
      SchedulingService.cancelAppointment({
        organizationId: testOrgAId,
        reference: apptRef,
        patientEmail: "imposter@example.com",
      }),
      "Must reject cancellation when patient email does not match",
    );

    // Valid cancellation
    const cancelRes = await SchedulingService.cancelAppointment({
      organizationId: testOrgAId,
      reference: apptRef,
      reason: "Patient had schedule conflict",
    });
    assert.strictEqual(cancelRes.success, true);

    // Cancel again (idempotent)
    const secondCancel = await SchedulingService.cancelAppointment({
      organizationId: testOrgAId,
      reference: apptRef,
    });
    assert.strictEqual(secondCancel.success, true);
    assert(secondCancel.message.includes("already been cancelled"));

    // After cancellation, verify slot is freed up for rebooking!
    const recheckedAvailability = await SchedulingService.checkAvailability({
      organizationId: testOrgAId,
      serviceId: serviceClean.id,
      dentistId: dentist1.id,
      date: "2026-09-21",
    });
    const isSlotFreed = recheckedAvailability.availableSlots.some(
      (s) => s.startTime === raceTargetStartTime,
    );
    assert(isSlotFreed, "Slot must be freed up after cancellation");
    console.log(
      "  ✔ Appointment cancellation, audit status, and slot release passed.",
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 7: Rescheduling
    // -------------------------------------------------------------------------
    console.log("▶ 7. Testing Rescheduling With Final Availability Check...");
    // Book a new appointment to reschedule
    const newBooking = await SchedulingService.bookAppointment({
      organizationId: testOrgAId,
      serviceId: serviceClean.id,
      dentistId: dentist1.id,
      startTime: "2026-09-21T10:00:00.000Z",
      patientName: "Alice Miller",
      patientEmail: "alice@example.com",
      patientPhone: "+1 (555) 999-8888",
      source: "MANUAL",
    });

    const rescheduled = await SchedulingService.rescheduleAppointment({
      organizationId: testOrgAId,
      reference: newBooking.reference,
      patientEmail: "alice@example.com",
      newStartTime: "2026-09-21T11:00:00.000Z",
    });
    assert.strictEqual(rescheduled.success, true);
    assert.strictEqual(
      rescheduled.startTimeFormatted !== newBooking.startTimeFormatted,
      true,
    );
    console.log("  ✔ Rescheduling and slot validation passed.");

    // -------------------------------------------------------------------------
    // TEST SECTION 8: Multi-Tenant Organization Isolation (Org A vs Org B)
    // -------------------------------------------------------------------------
    console.log("▶ 8. Testing Strict Multi-Tenant Organization Isolation...");
    // Org B cannot view or cancel Org A's appointment
    await assert.rejects(
      SchedulingService.cancelAppointment({
        organizationId: testOrgBId, // Cross-tenant leak attempt
        reference: newBooking.reference,
      }),
      "Org B must not be able to cancel Org A's appointment",
    );

    // Org B cannot book Org A's service
    await assert.rejects(
      SchedulingService.bookAppointment({
        organizationId: testOrgBId,
        serviceId: serviceClean.id, // Service belongs to Org A
        startTime: "2026-09-21T14:00:00.000Z",
        patientName: "Cross Tenant",
        patientEmail: "cross@example.com",
        patientPhone: "+15550000000",
      }),
      "Org B must not be able to book Org A's dental service",
    );
    console.log("  ✔ Strict multi-tenant isolation verified.");

    console.log("\n=======================================================");
    console.log("   All Phase 6 Google Calendar & Scheduling Tests Passed! ✔");
    console.log("=======================================================\n");
  } finally {
    // Cleanup test records
    await db.appointment.deleteMany({
      where: { organizationId: { in: [testOrgAId, testOrgBId] } },
    });
    await db.googleCalendarConnection.deleteMany({
      where: { organizationId: { in: [testOrgAId, testOrgBId] } },
    });
    await db.workingHours.deleteMany({
      where: { organizationId: { in: [testOrgAId, testOrgBId] } },
    });
    await db.holiday.deleteMany({
      where: { organizationId: { in: [testOrgAId, testOrgBId] } },
    });
    await db.service.deleteMany({
      where: { organizationId: { in: [testOrgAId, testOrgBId] } },
    });
    await db.dentist.deleteMany({
      where: { organizationId: { in: [testOrgAId, testOrgBId] } },
    });
    await db.organizationMembership.deleteMany({
      where: { organizationId: { in: [testOrgAId, testOrgBId] } },
    });
    await db.organization.deleteMany({
      where: { id: { in: [testOrgAId, testOrgBId] } },
    });
    await db.user.deleteMany({
      where: { id: testUserId },
    });
  }
}
