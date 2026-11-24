import { db } from "@/lib/db";
import type { WhatsAppCommandType, WhatsAppCommandRecord } from "./types";

export interface EnqueueCommandInput {
  organizationId: string;
  commandType: WhatsAppCommandType;
  payload?: Record<string, unknown> | null;
  idempotencyKey?: string | null;
  maxAttempts?: number;
}

export interface ClaimCommandOptions {
  workerId: string;
  leaseDurationMs?: number;
}

/**
 * WhatsApp Command Queue (PostgreSQL-backed for Vercel Daemons)
 * Provides durable, tenant-scoped, idempotent command queueing with
 * safe concurrency control and crash recovery using PostgreSQL FOR UPDATE SKIP LOCKED.
 */
export class WhatsAppCommandQueue {
  private static sanitizeError(err: unknown): string {
    if (!err) return "Unknown error";
    let message = err instanceof Error ? err.message : String(err);

    // Strip sensitive tokens, secrets, or credential patterns
    message = message.replace(/(bearer\s+)[^\s]+/gi, "$1[REDACTED]");
    message = message.replace(
      /(secret|key|token|auth)=[^&\s]+/gi,
      "$1=[REDACTED]",
    );
    message = message.replace(
      /data:image\/[^;]+;base64,[^\s"']+/gi,
      "[QR_IMAGE_DATA_REDACTED]",
    );

    // Truncate to safe length
    return message.slice(0, 500);
  }

  /**
   * Enqueue a durable command for the WhatsApp daemon.
   */
  public static async enqueueCommand(
    input: EnqueueCommandInput,
  ): Promise<WhatsAppCommandRecord> {
    const {
      organizationId,
      commandType,
      payload,
      idempotencyKey,
      maxAttempts = 3,
    } = input;

    if (!organizationId) {
      throw new Error(
        "organizationId is required to enqueue a WhatsApp command.",
      );
    }

    if (commandType !== "CONNECT" && commandType !== "DISCONNECT") {
      throw new Error(`Invalid commandType: ${commandType}`);
    }

    // 1. Idempotency key lookup
    if (idempotencyKey) {
      const existing = await db.whatsAppCommand.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return existing as WhatsAppCommandRecord;
      }
    }

    // 2. If enqueueing DISCONNECT, mark any pending CONNECT commands as superseded
    if (commandType === "DISCONNECT") {
      await db.whatsAppCommand.updateMany({
        where: {
          organizationId,
          commandType: "CONNECT",
          status: "PENDING",
        },
        data: {
          status: "FAILED",
          error: "Superseded by DISCONNECT command",
          completedAt: new Date(),
        },
      });
    }

    // 3. Prevent redundant duplicate commands:
    // If there is already a PENDING or PROCESSING command of the same type for this org, return it
    const existingActive = await db.whatsAppCommand.findFirst({
      where: {
        organizationId,
        commandType,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingActive) {
      return existingActive as WhatsAppCommandRecord;
    }

    const payloadJson = payload ? JSON.stringify(payload) : null;

    const command = await db.whatsAppCommand.create({
      data: {
        organizationId,
        commandType,
        status: "PENDING",
        payload: payloadJson,
        idempotencyKey: idempotencyKey || null,
        maxAttempts,
      },
    });

    return command as WhatsAppCommandRecord;
  }

  /**
   * Atomically claim the next pending or expired-lease command using PostgreSQL FOR UPDATE SKIP LOCKED.
   * Guarantees that only one worker instance can claim and process a command concurrently.
   */
  public static async claimNextCommand(
    options: ClaimCommandOptions,
  ): Promise<WhatsAppCommandRecord | null> {
    const { workerId, leaseDurationMs = 60000 } = options;
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs);

    // Atomically find, lock, and claim one command
    const results = await db.$queryRaw<WhatsAppCommandRecord[]>`
      UPDATE "whatsapp_command"
      SET "status" = 'PROCESSING'::"WhatsAppCommandStatus",
          "claimedAt" = ${now},
          "claimedBy" = ${workerId},
          "leaseExpiresAt" = ${leaseExpiresAt},
          "attemptCount" = "attemptCount" + 1,
          "updatedAt" = ${now}
      WHERE "id" = (
        SELECT "id"
        FROM "whatsapp_command"
        WHERE (
          "status" = 'PENDING'::"WhatsAppCommandStatus"
          OR (
            "status" = 'PROCESSING'::"WhatsAppCommandStatus"
            AND "leaseExpiresAt" < ${now}
          )
        )
        AND "attemptCount" < "maxAttempts"
        ORDER BY "createdAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
    `;

    if (!results || results.length === 0) {
      return null;
    }

    return results[0];
  }

  /**
   * Mark a claimed command as successfully COMPLETED.
   */
  public static async completeCommand(commandId: string): Promise<void> {
    await db.whatsAppCommand.update({
      where: { id: commandId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        leaseExpiresAt: null,
      },
    });
  }

  /**
   * Record a command failure with sanitized error message.
   * If retryable and attemptCount < maxAttempts, returns to PENDING for retry.
   */
  public static async failCommand(
    commandId: string,
    err: unknown,
    retryable = false,
  ): Promise<void> {
    const sanitizedMsg = this.sanitizeError(err);

    const command = await db.whatsAppCommand.findUnique({
      where: { id: commandId },
      select: { attemptCount: true, maxAttempts: true },
    });

    const isExhausted =
      !command || command.attemptCount >= command.maxAttempts || !retryable;

    if (isExhausted) {
      await db.whatsAppCommand.update({
        where: { id: commandId },
        data: {
          status: "FAILED",
          error: sanitizedMsg,
          completedAt: new Date(),
          leaseExpiresAt: null,
        },
      });
    } else {
      // Release lease back to PENDING for exponential backoff retry
      await db.whatsAppCommand.update({
        where: { id: commandId },
        data: {
          status: "PENDING",
          error: `Attempt failed: ${sanitizedMsg}`,
          leaseExpiresAt: null,
          claimedBy: null,
        },
      });
    }
  }

  /**
   * Safely release a lease back to PENDING if a worker shuts down gracefully mid-processing.
   */
  public static async releaseLease(commandId: string): Promise<void> {
    await db.whatsAppCommand.update({
      where: { id: commandId },
      data: {
        status: "PENDING",
        claimedBy: null,
        leaseExpiresAt: null,
      },
    });
  }

  /**
   * Clean up old completed/failed commands beyond retention period.
   * Does NOT touch WhatsAppAuthState or active connection state.
   */
  public static async cleanupOldCommands(retentionDays = 7): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const result = await db.whatsAppCommand.deleteMany({
      where: {
        status: { in: ["COMPLETED", "FAILED"] },
        updatedAt: { lt: cutoff },
      },
    });

    return result.count;
  }
}
