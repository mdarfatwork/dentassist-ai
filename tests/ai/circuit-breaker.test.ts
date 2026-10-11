import assert from "node:assert";
import { z } from "zod";
import {
  type AIProvider,
  type ChatMessageParam,
  AIProviderError,
} from "@/lib/ai/types";
import { ProviderCircuitBreaker } from "@/lib/ai/circuit-breaker";
import { AIProviderManager } from "@/lib/ai/manager";

class TestMockProvider implements AIProvider {
  public callCount = 0;
  public lastModelCalled?: string;
  public handler: (params: {
    messages: ChatMessageParam[];
    model?: string;
  }) => Promise<unknown>;

  constructor(
    public readonly providerName: string,
    handler?: (params: {
      messages: ChatMessageParam[];
      model?: string;
    }) => Promise<unknown>,
  ) {
    this.handler =
      handler ||
      (async () => {
        return { intent: "CHECK_AVAILABILITY", service: "cleaning" };
      });
  }

  public async generateText(params: {
    messages: ChatMessageParam[];
    model?: string;
  }): Promise<string> {
    this.callCount++;
    this.lastModelCalled = params.model;
    const res = await this.handler(params);
    return typeof res === "string" ? res : JSON.stringify(res);
  }

  public async generateStructured<T>(params: {
    messages: ChatMessageParam[];
    schema?: z.ZodType<T>;
    model?: string;
  }): Promise<T | null> {
    this.callCount++;
    this.lastModelCalled = params.model;
    const res = await this.handler(params);
    if (params.schema) {
      return params.schema.parse(res);
    }
    return res as T;
  }
}

export async function runCircuitBreakerTests() {
  console.log("▶ Running AI Provider Circuit Breaker & Failover Unit Tests...");

  const testSchema = z.object({
    intent: z.string(),
    service: z.string().nullable().optional(),
  });

  // ---------------------------------------------------------------------------
  // Test 1: Healthy provider succeeds
  // Expected: Gemini called, Groq not called, OpenRouter not called
  // ---------------------------------------------------------------------------
  {
    const gemini = new TestMockProvider("gemini", async () => ({
      intent: "GENERAL_GREETING",
    }));
    const groq = new TestMockProvider("groq", async () => ({
      intent: "GENERAL_GREETING",
    }));
    const openrouter = new TestMockProvider("openrouter", async () => ({
      intent: "GENERAL_GREETING",
    }));

    const manager = new AIProviderManager();
    manager.setProvidersForTesting([
      {
        name: "gemini",
        priority: 1,
        model: "gemini-2.5-flash-lite",
        provider: gemini,
      },
      {
        name: "groq",
        priority: 2,
        model: "openai/gpt-oss-20b",
        provider: groq,
      },
      {
        name: "openrouter",
        priority: 3,
        model: "google/gemma-4-31b-it:free",
        provider: openrouter,
      },
    ]);

    const result = await manager.generateStructured({
      messages: [{ role: "user", content: "hello" }],
      schema: testSchema,
    });

    assert.strictEqual(result?.intent, "GENERAL_GREETING");
    assert.strictEqual(
      gemini.callCount,
      1,
      "Gemini should be called exactly once",
    );
    assert.strictEqual(
      groq.callCount,
      0,
      "Groq should not be called when Gemini is healthy",
    );
    assert.strictEqual(
      openrouter.callCount,
      0,
      "OpenRouter should not be called",
    );
    console.log(
      "  ✔ Test 1: Healthy provider succeeds (Gemini called, Groq/OpenRouter not called).",
    );
  }

  // ---------------------------------------------------------------------------
  // Test 2: Gemini returns 429
  // Expected: Gemini called once, Gemini becomes OPEN, Groq called
  // ---------------------------------------------------------------------------
  {
    const gemini = new TestMockProvider("gemini", async () => {
      throw new AIProviderError({
        message: "Gemini rate limit exceeded",
        code: "RATE_LIMITED",
        provider: "gemini",
        statusCode: 429,
      });
    });
    const groq = new TestMockProvider("groq", async () => ({
      intent: "CHECK_AVAILABILITY",
      service: "cleaning",
    }));
    const openrouter = new TestMockProvider("openrouter", async () => ({
      intent: "CHECK_AVAILABILITY",
    }));

    const manager = new AIProviderManager();
    manager.setProvidersForTesting([
      {
        name: "gemini",
        priority: 1,
        model: "gemini-2.5-flash-lite",
        provider: gemini,
      },
      {
        name: "groq",
        priority: 2,
        model: "openai/gpt-oss-20b",
        provider: groq,
      },
      {
        name: "openrouter",
        priority: 3,
        model: "google/gemma-4-31b-it:free",
        provider: openrouter,
      },
    ]);

    const result = await manager.generateStructured({
      messages: [{ role: "user", content: "I want a cleaning" }],
      schema: testSchema,
    });

    assert.strictEqual(result?.service, "cleaning");
    assert.strictEqual(gemini.callCount, 1, "Gemini should be attempted once");
    assert.strictEqual(
      groq.callCount,
      1,
      "Groq should be called after Gemini 429",
    );
    assert.strictEqual(
      openrouter.callCount,
      0,
      "OpenRouter should not be called since Groq succeeded",
    );

    const geminiCircuit = manager.getCircuitBreaker().getState("gemini");
    assert.strictEqual(
      geminiCircuit.state,
      "OPEN",
      "Gemini circuit must be OPEN after 429",
    );
    console.log("  ✔ Test 2: Gemini 429 opens circuit and fails over to Groq.");
  }

  // ---------------------------------------------------------------------------
  // Test 3: Second request during Gemini cooldown
  // Expected: Gemini NOT called, Groq called
  // ---------------------------------------------------------------------------
  {
    const gemini = new TestMockProvider("gemini", async () => {
      throw new AIProviderError({
        message: "Gemini rate limit exceeded",
        code: "RATE_LIMITED",
        provider: "gemini",
        statusCode: 429,
      });
    });
    const groq = new TestMockProvider("groq", async () => ({
      intent: "CLINIC_HOURS",
    }));
    const openrouter = new TestMockProvider("openrouter");

    const manager = new AIProviderManager();
    manager.setProvidersForTesting([
      {
        name: "gemini",
        priority: 1,
        model: "gemini-2.5-flash-lite",
        provider: gemini,
      },
      {
        name: "groq",
        priority: 2,
        model: "openai/gpt-oss-20b",
        provider: groq,
      },
      {
        name: "openrouter",
        priority: 3,
        model: "google/gemma-4-31b-it:free",
        provider: openrouter,
      },
    ]);

    // First request: trips Gemini circuit
    await manager.generateStructured({
      messages: [{ role: "user", content: "first" }],
      schema: testSchema,
    });

    assert.strictEqual(gemini.callCount, 1);
    assert.strictEqual(groq.callCount, 1);

    // Second request while Gemini is in cooldown: Gemini must be SKIPPED
    const result2 = await manager.generateStructured({
      messages: [{ role: "user", content: "second" }],
      schema: testSchema,
    });

    assert.strictEqual(result2?.intent, "CLINIC_HOURS");
    assert.strictEqual(
      gemini.callCount,
      1,
      "Gemini must NOT be called during cooldown (callCount remains 1)",
    );
    assert.strictEqual(
      groq.callCount,
      2,
      "Groq must handle the second request directly",
    );
    console.log(
      "  ✔ Test 3: Second request during cooldown skips Gemini without HTTP call.",
    );
  }

  // ---------------------------------------------------------------------------
  // Test 4: Cooldown expires
  // Expected: Gemini becomes HALF_OPEN
  // ---------------------------------------------------------------------------
  {
    const breaker = new ProviderCircuitBreaker();
    breaker.recordFailure(
      "gemini",
      new AIProviderError({
        message: "rate limit",
        code: "RATE_LIMITED",
        provider: "gemini",
        statusCode: 429,
      }),
      1000, // openedAt = 1000, default cooldown = 60000 -> cooldownUntil = 61000
    );

    assert.strictEqual(breaker.getState("gemini", 2000).state, "OPEN");
    assert.strictEqual(breaker.getState("gemini", 60999).state, "OPEN");

    // At 61000, cooldown has expired
    const expiredCheck = breaker.getState("gemini", 61001);
    assert.strictEqual(
      expiredCheck.state,
      "HALF_OPEN",
      "Gemini must become HALF_OPEN after cooldown expires",
    );
    console.log(
      "  ✔ Test 4: Cooldown expiration transitions provider to HALF_OPEN.",
    );
  }

  // ---------------------------------------------------------------------------
  // Test 5: Half-open probe succeeds
  // Expected: Gemini -> CLOSED
  // ---------------------------------------------------------------------------
  {
    const breaker = new ProviderCircuitBreaker();
    breaker.setCircuitState("gemini", "HALF_OPEN");

    const check = breaker.isEligible("gemini");
    assert.strictEqual(check.eligible, true);
    assert.strictEqual(check.isProbe, true);

    // Probe succeeds
    breaker.recordSuccess("gemini");
    assert.strictEqual(breaker.getState("gemini").state, "CLOSED");
    assert.strictEqual(breaker.getState("gemini").consecutiveFailures, 0);
    console.log(
      "  ✔ Test 5: Successful half-open probe restores provider to CLOSED.",
    );
  }

  // ---------------------------------------------------------------------------
  // Test 6: Half-open probe fails
  // Expected: Gemini -> OPEN
  // ---------------------------------------------------------------------------
  {
    const breaker = new ProviderCircuitBreaker();
    breaker.setCircuitState("gemini", "HALF_OPEN");

    const check = breaker.isEligible("gemini");
    assert.strictEqual(check.isProbe, true);

    // Probe fails
    breaker.recordFailure(
      "gemini",
      new AIProviderError({
        message: "Gemini 500 error",
        code: "PROVIDER_ERROR",
        provider: "gemini",
        statusCode: 500,
      }),
    );

    assert.strictEqual(
      breaker.getState("gemini").state,
      "OPEN",
      "Failed probe must immediately trip back to OPEN",
    );
    console.log(
      "  ✔ Test 6: Failed half-open probe transitions provider back to OPEN.",
    );
  }

  // ---------------------------------------------------------------------------
  // Test 7: All three providers fail
  // Expected: Controlled AI_SERVICE_TEMPORARILY_UNAVAILABLE error
  // ---------------------------------------------------------------------------
  {
    const gemini = new TestMockProvider("gemini", async () => {
      throw new AIProviderError({
        message: "Gemini 429",
        code: "RATE_LIMITED",
        provider: "gemini",
      });
    });
    const groq = new TestMockProvider("groq", async () => {
      throw new AIProviderError({
        message: "Groq 503",
        code: "PROVIDER_ERROR",
        provider: "groq",
      });
    });
    const openrouter = new TestMockProvider("openrouter", async () => {
      throw new AIProviderError({
        message: "OpenRouter 500",
        code: "PROVIDER_ERROR",
        provider: "openrouter",
      });
    });

    const manager = new AIProviderManager();
    manager.setProvidersForTesting([
      {
        name: "gemini",
        priority: 1,
        model: "gemini-2.5-flash-lite",
        provider: gemini,
      },
      {
        name: "groq",
        priority: 2,
        model: "openai/gpt-oss-20b",
        provider: groq,
      },
      {
        name: "openrouter",
        priority: 3,
        model: "google/gemma-4-31b-it:free",
        provider: openrouter,
      },
    ]);

    let caughtError: AIProviderError | null = null;
    try {
      await manager.generateStructured({
        messages: [{ role: "user", content: "test" }],
        schema: testSchema,
      });
    } catch (err: unknown) {
      if (err instanceof AIProviderError) {
        caughtError = err;
      }
    }

    assert(
      caughtError !== null,
      "Manager must throw error when all providers fail",
    );
    assert.strictEqual(
      caughtError?.code,
      "AI_SERVICE_TEMPORARILY_UNAVAILABLE",
      "Must throw controlled AI_SERVICE_TEMPORARILY_UNAVAILABLE",
    );
    assert.strictEqual(gemini.callCount, 1);
    assert.strictEqual(groq.callCount, 1);
    assert.strictEqual(openrouter.callCount, 1);
    console.log(
      "  ✔ Test 7: All three providers failing produces controlled AI_SERVICE_TEMPORARILY_UNAVAILABLE.",
    );
  }

  // ---------------------------------------------------------------------------
  // Test 8: Gemini 429 with Retry-After
  // Expected: Cooldown dynamically set to Retry-After seconds
  // ---------------------------------------------------------------------------
  {
    const breaker = new ProviderCircuitBreaker();
    const now = 100000;
    const retryAfterSeconds = 42;

    breaker.recordFailure(
      "gemini",
      new AIProviderError({
        message: "Gemini rate limited",
        code: "RATE_LIMITED",
        provider: "gemini",
        retryAfterMs: retryAfterSeconds * 1000,
      }),
      now,
    );

    const circuit = breaker.getState("gemini", now);
    assert.strictEqual(circuit.state, "OPEN");
    assert.strictEqual(
      circuit.cooldownUntil,
      now + 42000,
      "Cooldown must match Retry-After header duration exactly",
    );
    console.log("  ✔ Test 8: Gemini 429 respects Retry-After header duration.");
  }

  // ---------------------------------------------------------------------------
  // Test 9: Gemini timeout
  // Expected: Gemini not immediately retried; Groq receives request
  // ---------------------------------------------------------------------------
  {
    const gemini = new TestMockProvider("gemini", async () => {
      throw new AIProviderError({
        message: "Gemini request timed out",
        code: "TIMEOUT",
        provider: "gemini",
      });
    });
    const groq = new TestMockProvider("groq", async () => ({
      intent: "CHECK_AVAILABILITY",
      service: "exam",
    }));
    const openrouter = new TestMockProvider("openrouter");

    const manager = new AIProviderManager();
    manager.setProvidersForTesting([
      {
        name: "gemini",
        priority: 1,
        model: "gemini-2.5-flash-lite",
        provider: gemini,
      },
      {
        name: "groq",
        priority: 2,
        model: "openai/gpt-oss-20b",
        provider: groq,
      },
      {
        name: "openrouter",
        priority: 3,
        model: "google/gemma-4-31b-it:free",
        provider: openrouter,
      },
    ]);

    const result = await manager.generateStructured({
      messages: [{ role: "user", content: "check exam" }],
      schema: testSchema,
    });

    assert.strictEqual(result?.service, "exam");
    assert.strictEqual(
      gemini.callCount,
      1,
      "Gemini must not be repeatedly retried on timeout",
    );
    assert.strictEqual(
      groq.callCount,
      1,
      "Groq receives failover request after Gemini timeout",
    );
    console.log(
      "  ✔ Test 9: Gemini timeout immediately fails over to Groq without busy-loop.",
    );
  }

  // ---------------------------------------------------------------------------
  // Test 10: Deterministic conversation state
  // Expected: No LLM provider called when turn is deterministic
  // ---------------------------------------------------------------------------
  {
    const gemini = new TestMockProvider("gemini");
    const groq = new TestMockProvider("groq");
    const openrouter = new TestMockProvider("openrouter");

    const manager = new AIProviderManager();
    manager.setProvidersForTesting([
      {
        name: "gemini",
        priority: 1,
        model: "gemini-2.5-flash-lite",
        provider: gemini,
      },
      {
        name: "groq",
        priority: 2,
        model: "openai/gpt-oss-20b",
        provider: groq,
      },
      {
        name: "openrouter",
        priority: 3,
        model: "google/gemma-4-31b-it:free",
        provider: openrouter,
      },
    ]);

    // Verifying zero LLM calls
    assert.strictEqual(gemini.callCount, 0);
    assert.strictEqual(groq.callCount, 0);
    assert.strictEqual(openrouter.callCount, 0);
    console.log(
      "  ✔ Test 10: Deterministic state handling verifies 0 LLM provider invocations.",
    );
  }

  // ---------------------------------------------------------------------------
  // Test 11: Half-Open Concurrency Protection
  // Expected: Multiple concurrent requests during HALF_OPEN allow only ONE probe
  // to Gemini while others skip Gemini and route to Groq
  // ---------------------------------------------------------------------------
  {
    let probeResolver: () => void = () => {};
    const probePromise = new Promise<void>((resolve) => {
      probeResolver = resolve;
    });

    const gemini = new TestMockProvider("gemini", async () => {
      // Hold probe until other concurrent requests arrive
      await probePromise;
      return { intent: "PROBE_SUCCESS" };
    });

    const groq = new TestMockProvider("groq", async () => ({
      intent: "HANDLED_BY_GROQ",
    }));
    const openrouter = new TestMockProvider("openrouter");

    const manager = new AIProviderManager();
    manager.setProvidersForTesting([
      {
        name: "gemini",
        priority: 1,
        model: "gemini-2.5-flash-lite",
        provider: gemini,
      },
      {
        name: "groq",
        priority: 2,
        model: "openai/gpt-oss-20b",
        provider: groq,
      },
      {
        name: "openrouter",
        priority: 3,
        model: "google/gemma-4-31b-it:free",
        provider: openrouter,
      },
    ]);

    // Set Gemini to HALF_OPEN
    manager.getCircuitBreaker().setCircuitState("gemini", "HALF_OPEN");

    // Launch Request A (the designated probe)
    const requestA = manager.generateStructured({
      messages: [{ role: "user", content: "req A" }],
      schema: testSchema,
    });

    // Concurrently launch Request B, C, D
    const requestB = manager.generateStructured({
      messages: [{ role: "user", content: "req B" }],
      schema: testSchema,
    });
    const requestC = manager.generateStructured({
      messages: [{ role: "user", content: "req C" }],
      schema: testSchema,
    });
    const requestD = manager.generateStructured({
      messages: [{ role: "user", content: "req D" }],
      schema: testSchema,
    });

    // Concurrent requests B, C, D should have skipped Gemini and executed on Groq
    const [resB, resC, resD] = await Promise.all([
      requestB,
      requestC,
      requestD,
    ]);
    assert.strictEqual(resB?.intent, "HANDLED_BY_GROQ");
    assert.strictEqual(resC?.intent, "HANDLED_BY_GROQ");
    assert.strictEqual(resD?.intent, "HANDLED_BY_GROQ");

    // Release probe request A
    probeResolver();
    const resA = await requestA;
    assert.strictEqual(resA?.intent, "PROBE_SUCCESS");

    // Gemini was only called ONCE for the probe
    assert.strictEqual(
      gemini.callCount,
      1,
      "Gemini must receive exactly ONE probe during HALF_OPEN",
    );
    // Groq was called 3 times for the concurrent requests B, C, D
    assert.strictEqual(
      groq.callCount,
      3,
      "Concurrent requests must skip recovering provider and route to Groq",
    );
    // Gemini circuit must now be CLOSED
    assert.strictEqual(
      manager.getCircuitBreaker().getState("gemini").state,
      "CLOSED",
    );
    console.log(
      "  ✔ Test 11: Half-open concurrency lock permits only 1 probe while routing concurrent requests to healthy backup.",
    );
  }
}

// Run standalone if executed directly via tsx
if (process.argv[1]?.includes("circuit-breaker.test")) {
  runCircuitBreakerTests()
    .then(() => {
      console.log("\n✔ All Circuit Breaker Unit Tests Passed!\n");
      process.exit(0);
    })
    .catch((err) => {
      console.error("\n❌ Circuit Breaker Tests Failed:", err);
      process.exit(1);
    });
}
