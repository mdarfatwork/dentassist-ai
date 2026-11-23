if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(".env");
  } catch {}
  try {
    process.loadEnvFile(".env.local");
  } catch {}
}

import { runWhatsAppIntegrationTests } from "./whatsapp-integration.test";

async function main() {
  try {
    await runWhatsAppIntegrationTests();
    process.exit(0);
  } catch (err: unknown) {
    console.error("❌ WhatsApp Test Suite Failed:", err);
    process.exit(1);
  }
}

main();
