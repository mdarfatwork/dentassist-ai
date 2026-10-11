/**
 * Standalone OpenRouter Model Benchmark
 *
 * Runs pure AI provider benchmarking directly against OpenRouter free candidates
 * WITHOUT database, Prisma, Pinecone, or Prompt Guard overhead.
 *
 * Requirements:
 * 1. Tests 1 to 5:
 *    - Test 1: "I want to book a consultation for tomorrow morning" (Structured extraction)
 *    - Test 2: "I want teeth cleaning" (Structured service extraction)
 *    - Test 3: "What time does the clinic open?" (Structured hours inquiry)
 *    - Test 4: "Can I come tomorrow around nine?" (Structured date/time extraction)
 *    - Test 5: Native tool call for checkAvailability
 * 2. Strict 429 Rate-Limit Handling:
 *    - Rejections marked strictly as RATE_LIMITED.
 *    - Excluded from model inference latency averages.
 * 3. Compares Gemma 31B/26B vs Nemotron 120B and Qwen 27B.
 */

import fs from "node:fs";
import path from "node:path";

// Ensure .env.local and .env are loaded into process.env before anything else
function loadLocalEnv() {
  for (const envFile of [".env.local", ".env"]) {
    const fullPath = path.resolve(process.cwd(), envFile);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadLocalEnv();

import { OpenRouterAIProvider, AIProviderError } from "@/lib/ai/provider";
import { ReceptionistIntentExtractionSchema } from "@/lib/receptionist/types";
import { RECEPTIONIST_TOOLS } from "@/lib/receptionist/tools";

interface TestResult {
  testId: number;
  name: string;
  success: boolean;
  isRateLimited: boolean;
  errorCode?: string;
  durationMs: number;
  outputPreview?: string;
  error?: string;
}

interface ModelBenchmarkSummary {
  model: string;
  totalTests: number;
  passedTests: number;
  rateLimitedCount: number;
  otherFailedCount: number;
  validLatencies: number[];
  avgLatencyMs: number | null;
  status: "PASSED" | "RATE_LIMITED" | "FAILED";
  results: TestResult[];
}

const CANDIDATE_MODELS = [
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "qwen/qwen3.8-27b:free",
];

const TESTS = [
  {
    id: 1,
    name: "Consultation Tomorrow Morning (Extraction)",
    type: "structured" as const,
    prompt: "I want to book a consultation for tomorrow morning",
  },
  {
    id: 2,
    name: "Teeth Cleaning Request (Extraction)",
    type: "structured" as const,
    prompt: "I want teeth cleaning",
  },
  {
    id: 3,
    name: "Clinic Opening Hours (Extraction)",
    type: "structured" as const,
    prompt: "What time does the clinic open?",
  },
  {
    id: 4,
    name: "Date & Time Spec Tomorrow Around 9 (Extraction)",
    type: "structured" as const,
    prompt: "Can I come tomorrow around nine?",
  },
  {
    id: 5,
    name: "checkAvailability Tool Call",
    type: "tool" as const,
    prompt:
      "Please check availability for serviceId 'srv-cleaning' on date '2026-09-22'.",
  },
];

async function runModelBenchmark(
  provider: OpenRouterAIProvider,
  model: string,
): Promise<ModelBenchmarkSummary> {
  console.log(
    `\n=============================================================`,
  );
  console.log(`🚀 Benchmarking Model: ${model}`);
  console.log(`=============================================================`);

  const results: TestResult[] = [];
  const validLatencies: number[] = [];

  for (const t of TESTS) {
    const start = performance.now();
    try {
      if (t.type === "structured") {
        const extraction = await provider.generateStructured({
          model,
          messages: [
            {
              role: "system",
              content:
                'You are an AI receptionist for a dental clinic. Extract the patient\'s intent (must be strictly one of: "GENERAL_GREETING", "CLINIC_INFO", "CLINIC_HOURS", "SERVICE_CATALOG", "KNOWLEDGE_INQUIRY", "CHECK_AVAILABILITY", "SELECT_SLOT", "PROVIDE_PATIENT_DETAILS", "CONFIRM_BOOKING", "CANCEL_APPOINTMENT", "RESCHEDULE_APPOINTMENT", "GENERAL_QUESTION"), serviceName, dateReference, and timePreference from their message into valid JSON.',
            },
            { role: "user", content: t.prompt },
          ],
          schema: ReceptionistIntentExtractionSchema,
          temperature: 0,
        });

        const durationMs = Math.round(performance.now() - start);

        if (!extraction) {
          results.push({
            testId: t.id,
            name: t.name,
            success: false,
            isRateLimited: false,
            errorCode: "EMPTY_RESULT",
            durationMs,
            error: "Returned null structured extraction",
          });
          console.log(
            `  ❌ Test ${t.id} (${t.name}): Empty extraction in ${durationMs}ms`,
          );
        } else {
          validLatencies.push(durationMs);
          results.push({
            testId: t.id,
            name: t.name,
            success: true,
            isRateLimited: false,
            durationMs,
            outputPreview: JSON.stringify(extraction).slice(0, 80) + "...",
          });
          console.log(
            `  ✅ Test ${t.id} (${t.name}): Passed in ${durationMs}ms | Intent: ${extraction.intent}`,
          );
        }
      } else {
        // Tool call test
        const toolResult = await provider.callTool({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are an AI receptionist. If the user asks for available appointment slots, invoke the checkAvailability tool.",
            },
            { role: "user", content: t.prompt },
          ],
          tools: RECEPTIONIST_TOOLS,
          toolChoice: {
            type: "function",
            function: { name: "checkAvailability" },
          },
          temperature: 0,
        });

        const durationMs = Math.round(performance.now() - start);

        if (!toolResult) {
          results.push({
            testId: t.id,
            name: t.name,
            success: false,
            isRateLimited: false,
            errorCode: "NO_TOOL_CALLED",
            durationMs,
            error: "Model did not trigger checkAvailability tool",
          });
          console.log(
            `  ❌ Test ${t.id} (${t.name}): No tool called in ${durationMs}ms`,
          );
        } else {
          validLatencies.push(durationMs);
          results.push({
            testId: t.id,
            name: t.name,
            success: true,
            isRateLimited: false,
            durationMs,
            outputPreview: `tool: ${toolResult.name}, args: ${JSON.stringify(toolResult.args)}`,
          });
          console.log(
            `  ✅ Test ${t.id} (${t.name}): Passed in ${durationMs}ms | Called: ${toolResult.name}`,
          );
        }
      }
    } catch (err: unknown) {
      const durationMs = Math.round(performance.now() - start);
      const isRateLimited =
        (err instanceof AIProviderError && err.code === "RATE_LIMITED") ||
        (err as { status?: number })?.status === 429 ||
        String(err).includes("429") ||
        String(err).toLowerCase().includes("rate limit") ||
        String(err).toLowerCase().includes("rate-limited");

      const errorCode =
        err instanceof AIProviderError
          ? err.code
          : isRateLimited
            ? "RATE_LIMITED"
            : "UNKNOWN_ERROR";

      results.push({
        testId: t.id,
        name: t.name,
        success: false,
        isRateLimited,
        errorCode,
        durationMs,
        error: err instanceof Error ? err.message : String(err),
      });

      if (isRateLimited) {
        console.log(
          `  ⚠️ Test ${t.id} (${t.name}): RATE_LIMITED (429 upstream) in ${durationMs}ms [EXCLUDED FROM LATENCY AVG]`,
        );
      } else {
        console.log(
          `  ❌ Test ${t.id} (${t.name}): Failed [${errorCode}] in ${durationMs}ms`,
        );
      }
    }
  }

  const passedTests = results.filter((r) => r.success).length;
  const rateLimitedCount = results.filter((r) => r.isRateLimited).length;
  const otherFailedCount = results.filter(
    (r) => !r.success && !r.isRateLimited,
  ).length;

  const avgLatencyMs =
    validLatencies.length > 0
      ? Math.round(
          validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length,
        )
      : null;

  let status: ModelBenchmarkSummary["status"] = "PASSED";
  if (rateLimitedCount > 0) {
    status = "RATE_LIMITED";
  } else if (otherFailedCount > 0) {
    status = "FAILED";
  }

  return {
    model,
    totalTests: TESTS.length,
    passedTests,
    rateLimitedCount,
    otherFailedCount,
    validLatencies,
    avgLatencyMs,
    status,
    results,
  };
}

async function main() {
  console.log("=============================================================");
  console.log("🏥 DentAssist AI - OpenRouter Pure Provider Model Benchmark");
  console.log("=============================================================");

  const provider = new OpenRouterAIProvider();
  const summaries: ModelBenchmarkSummary[] = [];

  for (const model of CANDIDATE_MODELS) {
    const summary = await runModelBenchmark(provider, model);
    summaries.push(summary);
  }

  // Render Markdown Table
  console.log(
    "\n\n=============================================================",
  );
  console.log("📊 BENCHMARK RESULTS SUMMARY");
  console.log(
    "=============================================================\n",
  );

  console.log(
    "| Model | Status | Pass Rate | Valid Avg Latency | 429 Errors | Recommendation |",
  );
  console.log("| :--- | :---: | :---: | :---: | :---: | :--- |");

  for (const s of summaries) {
    const latencyStr =
      s.avgLatencyMs !== null ? `${s.avgLatencyMs} ms` : "N/A (429 Rejections)";
    const passRate = `${s.passedTests}/${s.totalTests} (${Math.round((s.passedTests / s.totalTests) * 100)}%)`;
    let recommendation = "";

    if (s.status === "RATE_LIMITED") {
      recommendation =
        "⛔ DO NOT USE: Upstream provider saturation (Google AI Studio 429)";
    } else if (s.status === "PASSED") {
      recommendation =
        "✅ RECOMMENDED: High reliability, instant responses, verified tool calling";
    } else {
      recommendation =
        "⚠️ EVALUATE: Partial failures or schema incompatibility";
    }

    console.log(
      `| \`${s.model}\` | **${s.status}** | ${passRate} | ${latencyStr} | ${s.rateLimitedCount} | ${recommendation} |`,
    );
  }

  console.log("\n### Detailed Per-Test Breakdown\n");
  for (const s of summaries) {
    console.log(`#### Model: \`${s.model}\` (Status: ${s.status})`);
    for (const r of s.results) {
      const statusIcon = r.success ? "✅" : r.isRateLimited ? "⚠️ [429]" : "❌";
      const info = r.success
        ? `Output: ${r.outputPreview}`
        : `Error: ${r.error}`;
      console.log(
        `- ${statusIcon} **Test ${r.testId}** (${r.name}): ${r.durationMs}ms - ${info}`,
      );
    }
    console.log("");
  }
}

main().catch((err) => {
  console.error("Benchmark runner failed:", err);
  process.exit(1);
});
