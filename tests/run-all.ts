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

async function main() {
  console.log("\n=======================================================");
  console.log("   DentAssist AI - Phase 4, 5 & 6 Automated Test Suite");
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
    console.log("\n=======================================================");
    console.log("   All Phase 4, Phase 5 & Phase 6 Automated Tests Passed! ✔");
    console.log("=======================================================\n");
    process.exit(0);
  } catch (err: unknown) {
    console.error("\n❌ Test Suite Failed:", err);
    process.exit(1);
  }
}

main();
