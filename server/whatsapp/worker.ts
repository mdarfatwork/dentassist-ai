// Load local environment files if running directly via Node/tsx
if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(".env");
  } catch {
    // ignore if .env does not exist
  }
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // ignore if .env.local does not exist
  }
}

import { WhatsAppDaemon } from "./daemon";

const daemon = new WhatsAppDaemon();

const handleSignal = async (signal: string) => {
  try {
    await daemon.shutdown(signal);
    process.exit(0);
  } catch (err) {
    console.error(`Error during ${signal} shutdown:`, err);
    process.exit(1);
  }
};

process.on("SIGINT", () => handleSignal("SIGINT"));
process.on("SIGTERM", () => handleSignal("SIGTERM"));

daemon.start().catch((err) => {
  console.error("FATAL: WhatsApp Daemon failed to start:", err);
  process.exit(1);
});
