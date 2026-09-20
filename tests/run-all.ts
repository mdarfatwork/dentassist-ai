import { runChunkingNormalizerTests } from "./knowledge/chunking-normalizer.test";
import { runPromptGuardTests } from "./knowledge/prompt-guard.test";
import { runMultiTenantIsolationTests } from "./knowledge/multi-tenant-isolation.test";
import { runAppointmentServiceTests } from "./receptionist/appointment-service.test";
import { runReceptionistServiceTests } from "./receptionist/receptionist-service.test";

async function main() {
  console.log("\n=======================================================");
  console.log("   DentAssist AI - Phase 4 & 5 Automated Test Suite");
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
    await runReceptionistServiceTests();
    console.log("\n=======================================================");
    console.log("   All Phase 4 & Phase 5 Automated Tests Passed! ✔");
    console.log("=======================================================\n");
    process.exit(0);
  } catch (err: unknown) {
    console.error("\n❌ Test Suite Failed:", err);
    process.exit(1);
  }
}

main();
