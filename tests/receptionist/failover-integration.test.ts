import assert from "node:assert";
import { db } from "@/lib/db";
import { ReceptionistWorkflowCoordinator } from "@/lib/receptionist/workflow";
import { type BookingState } from "@/lib/receptionist/types";
import { type AIProvider, AIProviderError } from "@/lib/ai/types";
import { AIProviderManager } from "@/lib/ai/manager";
import { setAIProviderForTesting } from "@/lib/ai/provider";

class MockTrackingProvider implements AIProvider {
  public callCount = 0;

  constructor(
    public readonly providerName: string,
    public handler: (params: Record<string, unknown>) => Promise<unknown>,
  ) {}

  public async generateText(params: {
    messages: unknown[];
    model?: string;
  }): Promise<string> {
    this.callCount++;
    return (await this.handler(params as Record<string, unknown>)) as string;
  }

  public async generateStructured<T>(params: {
    messages: unknown[];
    schema?: { parse: (val: unknown) => T };
    model?: string;
  }): Promise<T | null> {
    this.callCount++;
    const res = await this.handler(params as Record<string, unknown>);
    if (params.schema) {
      return params.schema.parse(res);
    }
    return res as T;
  }
}

export async function runFailoverIntegrationTests() {
  console.log("▶ Running Full Receptionist LLM Failover Integration Tests...");

  const testOrgId = `test_org_failover_${Date.now()}`;

  // 1. Setup Test Organization
  await db.organization.create({
    data: {
      id: testOrgId,
      name: "Apex Dental Clinic",
      slug: `apex-dental-${Date.now()}`,
      phone: "+1 (555) 777-8899",
      email: "hello@apexdental.com",
      timezone: "America/Chicago",
      dentists: {
        create: [
          {
            name: "Dr. Marcus Vance",
            specialization: "General & Restorative",
          },
        ],
      },
      services: {
        create: [
          {
            name: "Dental Cleaning",
            durationMinutes: 30,
            description: "Routine prophylaxis",
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
    // Setup Mocked 3-Provider Manager
    // Gemini: returns 429 RATE_LIMITED on Turn 1
    // Groq: succeeds and extracts intent
    // OpenRouter: tertiary backup
    // -------------------------------------------------------------------------
    const geminiMock = new MockTrackingProvider("gemini", async () => {
      throw new AIProviderError({
        message: "Gemini 429 Resource Exhausted",
        code: "RATE_LIMITED",
        provider: "gemini",
        statusCode: 429,
        retryAfterMs: 60000,
      });
    });

    const groqMock = new MockTrackingProvider("groq", async () => {
      return {
        intent: "CHECK_AVAILABILITY",
        serviceName: "Dental Cleaning",
        dateReference: "tomorrow",
        timePreference: { type: "morning" },
      };
    });

    const openrouterMock = new MockTrackingProvider("openrouter", async () => {
      return { intent: "GENERAL_GREETING" };
    });

    const manager = new AIProviderManager();
    manager.setProvidersForTesting([
      {
        name: "gemini",
        priority: 1,
        model: "gemini-2.5-flash-lite",
        provider: geminiMock,
      },
      {
        name: "groq",
        priority: 2,
        model: "openai/gpt-oss-20b",
        provider: groqMock,
      },
      {
        name: "openrouter",
        priority: 3,
        model: "google/gemma-4-31b-it:free",
        provider: openrouterMock,
      },
    ]);

    setAIProviderForTesting(manager);

    // -------------------------------------------------------------------------
    // TURN 1: Initial Booking Query ("I want to book a cleaning tomorrow morning")
    // Gemini trips 429 -> Groq extracts intent -> slots offered
    // -------------------------------------------------------------------------
    const initialBookingState: BookingState = {};

    const turn1Result = await ReceptionistWorkflowCoordinator.execute({
      organizationId: testOrgId,
      conversationId: "test_failover_convo_1",
      message: "I want to book a cleaning tomorrow morning",
      bookingState: initialBookingState,
      historyMessages: [],
    });

    // Verification 1: Gemini was attempted once and failed with 429
    assert.strictEqual(
      geminiMock.callCount,
      1,
      "Gemini must be attempted on Turn 1",
    );
    assert.strictEqual(
      manager.getCircuitBreaker().getState("gemini").state,
      "OPEN",
      "Gemini circuit must be OPEN after 429",
    );

    // Verification 2: Failover to Groq succeeded
    assert.strictEqual(
      groqMock.callCount,
      1,
      "Groq must handle failover on Turn 1",
    );
    assert.strictEqual(
      openrouterMock.callCount,
      0,
      "OpenRouter must not be called since Groq succeeded",
    );

    // Verification 3: Service resolved and slots offered
    assert.strictEqual(turn1Result.bookingState.serviceId, cleaningService.id);
    assert(
      turn1Result.bookingState.lastOfferedSlots &&
        turn1Result.bookingState.lastOfferedSlots.length > 0,
    );
    console.log(
      "  ✔ Turn 1 passed: Gemini 429 opened circuit, failover to Groq extracted booking request.",
    );

    // -------------------------------------------------------------------------
    // TURN 2: Slot Selection ("9:30 AM")
    // MUST BE DETERMINISTIC -> 0 LLM CALLS!
    // -------------------------------------------------------------------------
    const selectedSlotCandidate = turn1Result.bookingState.lastOfferedSlots[0];
    const slotSelectionMessage = selectedSlotCandidate.timeString; // e.g. "09:00 AM"

    const geminiCallsBeforeTurn2 = geminiMock.callCount;
    const groqCallsBeforeTurn2 = groqMock.callCount;

    const turn2Result = await ReceptionistWorkflowCoordinator.execute({
      organizationId: testOrgId,
      conversationId: "test_failover_convo_1",
      message: slotSelectionMessage,
      bookingState: turn1Result.bookingState,
      historyMessages: [
        { role: "user", content: "I want to book a cleaning tomorrow morning" },
        { role: "assistant", content: turn1Result.reply },
      ],
    });

    // Verification 4: Zero LLM calls occurred on deterministic slot turn!
    assert.strictEqual(
      geminiMock.callCount,
      geminiCallsBeforeTurn2,
      "Gemini must NOT be called on slot selection",
    );
    assert.strictEqual(
      groqMock.callCount,
      groqCallsBeforeTurn2,
      "Groq must NOT be called on slot selection",
    );
    assert.strictEqual(
      turn2Result.bookingState.status,
      "awaiting_patient_details",
    );
    assert.strictEqual(
      turn2Result.bookingState.selectedStartTime,
      selectedSlotCandidate.startTime,
    );
    console.log(
      `  ✔ Turn 2 passed: Slot selection (${slotSelectionMessage}) processed deterministically with 0 LLM calls.`,
    );

    // -------------------------------------------------------------------------
    // TURN 3: Patient Contact Intake ("Alex Smith, alex@example.com, +15551234567")
    // MUST BE DETERMINISTIC -> 0 LLM CALLS!
    // -------------------------------------------------------------------------
    const geminiCallsBeforeTurn3 = geminiMock.callCount;
    const groqCallsBeforeTurn3 = groqMock.callCount;

    const turn3Result = await ReceptionistWorkflowCoordinator.execute({
      organizationId: testOrgId,
      conversationId: "test_failover_convo_1",
      message:
        "My name is Alex Smith, email is alex@example.com, phone is 555-123-4567",
      bookingState: turn2Result.bookingState,
      historyMessages: [
        { role: "user", content: "I want to book a cleaning tomorrow morning" },
        { role: "assistant", content: turn1Result.reply },
        { role: "user", content: slotSelectionMessage },
        { role: "assistant", content: turn2Result.reply },
      ],
    });

    assert.strictEqual(
      geminiMock.callCount,
      geminiCallsBeforeTurn3,
      "Gemini must NOT be called on contact intake",
    );
    assert.strictEqual(
      groqMock.callCount,
      groqCallsBeforeTurn3,
      "Groq must NOT be called on contact intake",
    );
    assert.strictEqual(turn3Result.bookingState.patientName, "Alex Smith");
    assert.strictEqual(
      turn3Result.bookingState.patientEmail,
      "alex@example.com",
    );
    assert.strictEqual(
      turn3Result.bookingState.status,
      "awaiting_confirmation",
    );
    assert.strictEqual(turn3Result.bookingState.confirmationPending, true);
    console.log(
      "  ✔ Turn 3 passed: Patient contact details intake processed deterministically with 0 LLM calls.",
    );

    // -------------------------------------------------------------------------
    // TURN 4: Explicit Confirmation ("yes")
    // MUST BE DETERMINISTIC -> 0 LLM CALLS!
    // -------------------------------------------------------------------------
    const geminiCallsBeforeTurn4 = geminiMock.callCount;
    const groqCallsBeforeTurn4 = groqMock.callCount;

    const turn4Result = await ReceptionistWorkflowCoordinator.execute({
      organizationId: testOrgId,
      conversationId: "test_failover_convo_1",
      message: "yes",
      bookingState: turn3Result.bookingState,
      historyMessages: [
        { role: "user", content: "I want to book a cleaning tomorrow morning" },
        { role: "assistant", content: turn1Result.reply },
        { role: "user", content: slotSelectionMessage },
        { role: "assistant", content: turn2Result.reply },
        {
          role: "user",
          content:
            "My name is Alex Smith, email is alex@example.com, phone is 555-123-4567",
        },
        { role: "assistant", content: turn3Result.reply },
      ],
    });

    assert.strictEqual(
      geminiMock.callCount,
      geminiCallsBeforeTurn4,
      "Gemini must NOT be called on confirmation",
    );
    assert.strictEqual(
      groqMock.callCount,
      groqCallsBeforeTurn4,
      "Groq must NOT be called on confirmation",
    );
    assert.strictEqual(turn4Result.bookingState.isConfirmed, true);
    assert(
      turn4Result.bookingState.appointmentReference,
      "Appointment reference must be created in DB",
    );

    // Verify appointment was written to DB
    const createdAppointment = await db.appointment.findFirst({
      where: { organizationId: testOrgId, patientName: "Alex Smith" },
    });
    assert(createdAppointment !== null, "Appointment must exist in database");
    assert.strictEqual(createdAppointment.patientName, "Alex Smith");
    assert.strictEqual(createdAppointment.organizationId, testOrgId);
    console.log(
      "  ✔ Turn 4 passed: Confirmation processed deterministically and appointment booked in DB.",
    );

    // -------------------------------------------------------------------------
    // SCENARIO 5: All Providers Fail -> No Fake GENERAL_QUESTION Fallback
    // -------------------------------------------------------------------------
    const allFailManager = new AIProviderManager();
    const failGemini = new MockTrackingProvider("gemini", async () => {
      throw new AIProviderError({
        message: "Gemini down",
        code: "PROVIDER_ERROR",
        provider: "gemini",
      });
    });
    const failGroq = new MockTrackingProvider("groq", async () => {
      throw new AIProviderError({
        message: "Groq down",
        code: "PROVIDER_ERROR",
        provider: "groq",
      });
    });
    const failOpenRouter = new MockTrackingProvider("openrouter", async () => {
      throw new AIProviderError({
        message: "OpenRouter down",
        code: "PROVIDER_ERROR",
        provider: "openrouter",
      });
    });

    allFailManager.setProvidersForTesting([
      {
        name: "gemini",
        priority: 1,
        model: "gemini-2.5-flash-lite",
        provider: failGemini,
      },
      {
        name: "groq",
        priority: 2,
        model: "openai/gpt-oss-20b",
        provider: failGroq,
      },
      {
        name: "openrouter",
        priority: 3,
        model: "google/gemma-4-31b-it:free",
        provider: failOpenRouter,
      },
    ]);
    setAIProviderForTesting(allFailManager);

    const failoverResult = await ReceptionistWorkflowCoordinator.execute({
      organizationId: testOrgId,
      conversationId: "test_all_fail_convo",
      message: "Can you advise on severe tooth pain?",
      bookingState: {},
      historyMessages: [],
    });

    // Verify it did NOT become GENERAL_QUESTION or invent answers
    assert(
      failoverResult.reply.includes(
        "temporarily unable to process that request",
      ),
      `Must return safe apology message, got: ${failoverResult.reply}`,
    );
    console.log(
      "  ✔ Scenario 5 passed: Total provider failure returns controlled apology without fake GENERAL_QUESTION fallback.",
    );
  } finally {
    // Restore default provider
    setAIProviderForTesting(null);

    // Cleanup database test data
    await db.appointment.deleteMany({ where: { organizationId: testOrgId } });
    await db.workingHours.deleteMany({ where: { organizationId: testOrgId } });
    await db.dentist.deleteMany({ where: { organizationId: testOrgId } });
    await db.service.deleteMany({ where: { organizationId: testOrgId } });
    await db.organization.delete({ where: { id: testOrgId } });
  }
}

// Run standalone if executed directly via tsx
if (process.argv[1]?.includes("failover-integration.test")) {
  runFailoverIntegrationTests()
    .then(() => {
      console.log("\n✔ All Failover Integration Tests Passed!\n");
      process.exit(0);
    })
    .catch((err) => {
      console.error("\n❌ Failover Integration Tests Failed:", err);
      process.exit(1);
    });
}
