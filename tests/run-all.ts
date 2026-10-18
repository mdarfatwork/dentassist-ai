import { runChunkingNormalizerTests } from "./knowledge/chunking-normalizer.test";
import { runPromptGuardTests } from "./knowledge/prompt-guard.test";
import { runMultiTenantIsolationTests } from "./knowledge/multi-tenant-isolation.test";
import { runAppointmentServiceTests } from "./receptionist/appointment-service.test";
import { runServiceResolutionTests } from "./receptionist/service-resolution.test";
import { runDeterministicWorkflowTests } from "./receptionist/deterministic-workflow.test";
import { runReceptionistServiceTests } from "./receptionist/receptionist-service.test";
import { runCircuitBreakerTests } from "./ai/circuit-breaker.test";
import { runFailoverIntegrationTests } from "./receptionist/failover-integration.test";
import { runPhase6Tests } from "./calendar/phase6-google-calendar-scheduling.test";
import { runVoiceReceptionistTests } from "./voice/voice-receptionist.test";
import { runWidgetTests } from "./widget/widget.test";
import { runPlaygroundTraceTests } from "./receptionist/playground-trace.test";

async function main() {
  console.log("\n=======================================================");
  console.log("   DentAssist AI - Phases 4 through 9 Automated Test Suite");
  console.log("=======================================================\n");

  try {
    await runChunkingNormalizerTests();
    console.log("");
    await runPromptGuardTests();
    console.log("");
    await runMultiTenantIsolationTests();
    console.log("");
    await runAppointmentServiceTests();
    console.log("");
    await runServiceResolutionTests();
    console.log("");
    await runDeterministicWorkflowTests();
    console.log("");
    await runCircuitBreakerTests();
    console.log("");
    await runFailoverIntegrationTests();
    console.log("");
    await runReceptionistServiceTests();
    console.log("");
    await runPhase6Tests();
    console.log("");
    await runVoiceReceptionistTests();
    console.log("");
    await runWidgetTests();
    console.log("");
    await runPlaygroundTraceTests();
    console.log("\n=======================================================");
    console.log("   All Phases 4, 5, 6, 7, 8 & 9 Automated Tests Passed! ✔");
    console.log("=======================================================\n");
    process.exit(0);
  } catch (err: unknown) {
    console.error("\n❌ Test Suite Failed:", err);
    process.exit(1);
  }
}

main();
