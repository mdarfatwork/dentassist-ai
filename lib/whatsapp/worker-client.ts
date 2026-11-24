import { db } from "@/lib/db";
import { WhatsAppCommandQueue } from "./command-queue";
import type {
  WhatsAppConnectionState,
  WorkerSessionStatusResponse,
  WorkerConnectResponse,
  WorkerDisconnectResponse,
} from "./types";

/**
 * WhatsApp Worker Client (Vercel Daemon Architecture)
 * Writes durable commands to PostgreSQL and reads authoritative state directly from the database.
 * Completely eliminates inbound HTTP dependencies to the persistent worker.
 */
export class WhatsAppWorkerClient {
  /**
   * Request the daemon to start or restore a Baileys session for the clinic organization
   * via the durable PostgreSQL command queue.
   */
  public static async connect(
    organizationId: string,
  ): Promise<WorkerConnectResponse> {
    if (!organizationId) {
      throw new Error("organizationId is required to connect WhatsApp.");
    }

    // 1. Check current connection status
    const existing = await db.whatsAppConnection.findUnique({
      where: { organizationId },
    });

    if (existing?.status === "CONNECTED") {
      return {
        success: true,
        message: "WhatsApp session is already connected.",
        status: "CONNECTED",
      };
    }

    // 2. Set intermediate CONNECTING state in database
    await db.whatsAppConnection.upsert({
      where: { organizationId },
      update: {
        status: "CONNECTING",
        disconnectReason: null,
      },
      create: {
        organizationId,
        status: "CONNECTING",
      },
    });

    // 3. Enqueue durable CONNECT command for the daemon
    const command = await WhatsAppCommandQueue.enqueueCommand({
      organizationId,
      commandType: "CONNECT",
    });

    return {
      success: true,
      message: "Connection command queued for WhatsApp daemon.",
      status: "CONNECTING",
      commandId: command.id,
    };
  }

  /**
   * Request the daemon to disconnect and unlink the Baileys session for the clinic organization
   * via the durable PostgreSQL command queue.
   */
  public static async disconnect(
    organizationId: string,
  ): Promise<WorkerDisconnectResponse> {
    if (!organizationId) {
      throw new Error("organizationId is required to disconnect WhatsApp.");
    }

    // 1. Eagerly update database state to DISCONNECTED to stop UI polling immediately
    await db.whatsAppConnection.upsert({
      where: { organizationId },
      update: {
        status: "DISCONNECTED",
        qrCode: null,
        qrExpiresAt: null,
        disconnectReason: "Manually disconnected by user",
        lastDisconnectedAt: new Date(),
      },
      create: {
        organizationId,
        status: "DISCONNECTED",
        disconnectReason: "Manually disconnected by user",
        lastDisconnectedAt: new Date(),
      },
    });

    // 2. Purge encrypted auth credentials from database for security
    await db.whatsAppAuthState.deleteMany({
      where: { organizationId },
    });

    // 3. Enqueue durable DISCONNECT command so daemon terminates live socket in memory
    const command = await WhatsAppCommandQueue.enqueueCommand({
      organizationId,
      commandType: "DISCONNECT",
    });

    return {
      success: true,
      message: "Session disconnected and authentication state cleared.",
      commandId: command.id,
    };
  }

  /**
   * Get the current WhatsApp connection state for the organization directly from PostgreSQL.
   */
  public static async getStatus(
    organizationId: string,
  ): Promise<WorkerSessionStatusResponse> {
    if (!organizationId) {
      return {
        success: false,
        state: {
          organizationId: "",
          status: "DISCONNECTED",
        },
        isSocketActive: false,
      };
    }

    const conn = await db.whatsAppConnection.findUnique({
      where: { organizationId },
    });

    const isConnected = conn?.status === "CONNECTED";
    const now = new Date();

    // Check if QR code has expired
    const isQrExpired =
      conn?.status === "AWAITING_SCAN" &&
      conn.qrExpiresAt &&
      conn.qrExpiresAt < now;

    const effectiveStatus = isQrExpired
      ? "CONNECTING"
      : conn?.status || "DISCONNECTED";
    const effectiveQrCode = isQrExpired ? null : conn?.qrCode || null;

    const state: WhatsAppConnectionState = {
      organizationId,
      status: effectiveStatus,
      phoneNumber: conn?.phoneNumber,
      jid: conn?.jid,
      platform: conn?.platform,
      pushName: conn?.pushName,
      qrCode: effectiveQrCode,
      qrExpiresAt: conn?.qrExpiresAt?.toISOString() || null,
      lastConnectedAt: conn?.lastConnectedAt?.toISOString() || null,
      lastDisconnectedAt: conn?.lastDisconnectedAt?.toISOString() || null,
      disconnectReason: conn?.disconnectReason,
    };

    return {
      success: true,
      state,
      isSocketActive: isConnected,
    };
  }
}
