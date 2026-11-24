import crypto from "node:crypto";
import { db } from "@/lib/db";
import { WhatsAppCommandQueue } from "@/lib/whatsapp/command-queue";
import { WhatsAppSessionManager } from "./session-manager";
import type { WhatsAppCommandRecord } from "@/lib/whatsapp/types";

export interface WhatsAppDaemonOptions {
  workerId?: string;
  pollIntervalMs?: number;
  leaseDurationMs?: number;
  retentionDays?: number;
}

/**
 * WhatsApp Daemon (Vercel Daemon Worker Engine)
 * Runs continuously in a Docker container on Vercel Fluid compute with no inbound HTTP listeners.
 * Polls PostgreSQL for durable commands, owns persistent Baileys WebSocket sessions,
 * guarantees graceful shutdown on SIGTERM, and recovers from transient network failures.
 */
export class WhatsAppDaemon {
  private workerId: string;
  private pollIntervalMs: number;
  private leaseDurationMs: number;
  private retentionDays: number;
  private isRunning = false;
  private isStopping = false;
  private currentInFlightCommand: WhatsAppCommandRecord | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private sessionManager = WhatsAppSessionManager.getInstance();

  constructor(options: WhatsAppDaemonOptions = {}) {
    const randomSuffix = crypto.randomBytes(4).toString("hex");
    this.workerId =
      options.workerId ||
      `daemon-${process.env.VERCEL_REGION || "local"}-${process.pid}-${randomSuffix}`;
    this.pollIntervalMs = options.pollIntervalMs || 1000;
    this.leaseDurationMs = options.leaseDurationMs || 60000;
    this.retentionDays = options.retentionDays || 7;
  }

  /**
   * Validate runtime environment variables and dependencies before starting.
   * Fails fast with secret-safe diagnostic error if encryption keys or database are invalid.
   */
  private validateEnvironment(): void {
    const dbUrl = process.env.DATABASE_URL || process.env.DB_URL;
    if (!dbUrl) {
      throw new Error(
        "FATAL: DATABASE_URL is not set. WhatsApp daemon requires PostgreSQL connection.",
      );
    }

    const encKey =
      process.env.WHATSAPP_AUTH_ENCRYPTION_KEY ||
      process.env.BETTER_AUTH_SECRET;
    if (!encKey) {
      throw new Error(
        "FATAL: WHATSAPP_AUTH_ENCRYPTION_KEY or BETTER_AUTH_SECRET is required for encrypted credential storage.",
      );
    }
  }

  /**
   * Execute a single claimed command.
   */
  private async processCommand(command: WhatsAppCommandRecord): Promise<void> {
    const { id, organizationId, commandType, attemptCount } = command;
    this.currentInFlightCommand = command;

    console.log(
      `[WhatsApp Daemon ${this.workerId}] Processing command ${id} (${commandType}) for org: ${organizationId} (attempt ${attemptCount})`,
    );

    try {
      if (commandType === "CONNECT") {
        await this.sessionManager.startSession(organizationId);
      } else if (commandType === "DISCONNECT") {
        await this.sessionManager.disconnectSession(organizationId);
      } else {
        throw new Error(`Unsupported commandType: ${commandType}`);
      }

      await WhatsAppCommandQueue.completeCommand(id);
      console.log(
        `[WhatsApp Daemon ${this.workerId}] Successfully completed command ${id} (${commandType})`,
      );
    } catch (err: unknown) {
      const isRetryable =
        err instanceof Error &&
        !err.message.includes("Invalid credentials") &&
        !err.message.includes("Unsupported commandType");

      console.error(
        `[WhatsApp Daemon ${this.workerId}] Error executing command ${id} for org ${organizationId}:`,
        err instanceof Error ? err.message : String(err),
      );

      await WhatsAppCommandQueue.failCommand(id, err, isRetryable);
    } finally {
      this.currentInFlightCommand = null;
    }
  }

  /**
   * Start the continuous daemon polling loop.
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;

    this.validateEnvironment();
    this.isRunning = true;
    this.isStopping = false;

    console.log("\n=======================================================");
    console.log(`  DentAssist AI WhatsApp Daemon Started`);
    console.log(`  Worker ID: ${this.workerId}`);
    console.log(`  PID: ${process.pid} | Node: ${process.version}`);
    console.log(`  Region: ${process.env.VERCEL_REGION || "local"}`);
    console.log(`  Architecture: Database-backed command queue (PostgreSQL)`);
    console.log("=======================================================\n");

    // 1. Restore all existing active/connecting sessions on startup
    try {
      await this.sessionManager.restoreAllSessions();
    } catch (restoreErr) {
      console.error(
        `[WhatsApp Daemon ${this.workerId}] Session restoration warning:`,
        restoreErr,
      );
    }

    // 2. Schedule periodic cleanup for old completed commands (every 10 minutes)
    this.cleanupInterval = setInterval(
      async () => {
        try {
          const purged = await WhatsAppCommandQueue.cleanupOldCommands(
            this.retentionDays,
          );
          if (purged > 0) {
            console.log(
              `[WhatsApp Daemon ${this.workerId}] Purged ${purged} old completed commands.`,
            );
          }
        } catch (cleanupErr) {
          console.warn(
            `[WhatsApp Daemon ${this.workerId}] Cleanup error:`,
            cleanupErr,
          );
        }
      },
      10 * 60 * 1000,
    );

    // 3. Main processing loop
    let errorCount = 0;

    while (this.isRunning && !this.isStopping) {
      try {
        const command = await WhatsAppCommandQueue.claimNextCommand({
          workerId: this.workerId,
          leaseDurationMs: this.leaseDurationMs,
        });

        if (command) {
          errorCount = 0;
          await this.processCommand(command);
          // If work was processed, immediately poll again with short delay to drain backlog
          await new Promise((resolve) => setTimeout(resolve, 50));
        } else {
          errorCount = 0;
          // Idle delay
          await new Promise((resolve) =>
            setTimeout(resolve, this.pollIntervalMs),
          );
        }
      } catch (loopErr: unknown) {
        errorCount++;
        const backoffMs = Math.min(1000 * Math.pow(2, errorCount - 1), 5000);
        console.error(
          `[WhatsApp Daemon ${this.workerId}] Polling loop error (backing off ${backoffMs}ms):`,
          loopErr instanceof Error ? loopErr.message : String(loopErr),
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    console.log(
      `[WhatsApp Daemon ${this.workerId}] Main processing loop exited.`,
    );
  }

  /**
   * Perform graceful shutdown on SIGTERM / SIGINT signals.
   */
  public async shutdown(signal = "SIGTERM"): Promise<void> {
    if (this.isStopping) return;
    this.isStopping = true;
    this.isRunning = false;

    console.log(
      `\n[WhatsApp Daemon ${this.workerId}] Received ${signal}. Initiating graceful shutdown...`,
    );

    // Stop periodic cleanup
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // If a command is actively being processed, allow up to 10s grace period for it to complete
    if (this.currentInFlightCommand) {
      console.log(
        `[WhatsApp Daemon ${this.workerId}] Awaiting in-flight command ${this.currentInFlightCommand.id}...`,
      );
      const startWait = Date.now();
      while (this.currentInFlightCommand && Date.now() - startWait < 10000) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // If still in-flight after 10s, safely release lease back to PENDING for another worker
      if (this.currentInFlightCommand) {
        console.warn(
          `[WhatsApp Daemon ${this.workerId}] Releasing lease for in-flight command ${this.currentInFlightCommand.id}`,
        );
        try {
          await WhatsAppCommandQueue.releaseLease(
            this.currentInFlightCommand.id,
          );
        } catch {
          // ignore lease release error during shutdown
        }
      }
    }

    // Gracefully shut down all active Baileys sockets
    try {
      await this.sessionManager.shutdown();
    } catch (sockErr) {
      console.warn(
        `[WhatsApp Daemon ${this.workerId}] Socket shutdown warning:`,
        sockErr,
      );
    }

    // Disconnect Prisma
    try {
      await db.$disconnect();
    } catch {
      // ignore db disconnect error
    }

    console.log(
      `[WhatsApp Daemon ${this.workerId}] Graceful shutdown completed cleanly.\n`,
    );
  }
}
