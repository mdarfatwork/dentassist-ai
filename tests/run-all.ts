import { runChunkingNormalizerTests } from "./knowledge/chunking-normalizer.test";
import { runPromptGuardTests } from "./knowledge/prompt-guard.test";
import { runMultiTenantIsolationTests } from "./knowledge/multi-tenant-isolation.test";

async function main() {
  console.log("\n=======================================================");
  console.log("   DentAssist AI - Phase 4 Automated Test Suite");
  console.log("=======================================================\n");

  try {
    await runChunkingNormalizerTests();
    console.log("");
    await runPromptGuardTests();
    console.log("");
    await runMultiTenantIsolationTests();
    console.log("\n=======================================================");
    console.log("   All Phase 4 Knowledge Base & RAG Tests Passed! ✔");
    console.log("=======================================================\n");
    process.exit(0);
  } catch (err: unknown) {
    console.error("\n❌ Test Suite Failed:", err);
    process.exit(1);
  }
}

main();
