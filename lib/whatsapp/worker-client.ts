import { env } from "@/config/env";
import { db } from "@/lib/db";
import type {
  WhatsAppConnectionState,
  WorkerSessionStatusResponse,
  WorkerConnectResponse,
  WorkerDisconnectResponse,
} from "./types";

/**
 * WhatsApp Worker Client
 * Facilitates secure, authenticated communication between the Next.js application
 * and the persistent Node.js WhatsApp worker service.
 */
export class WhatsAppWorkerClient {
  private static getBaseUrl(): string {
    return env.WHATSAPP_WORKER_URL.replace(/\/$/, "");
  }

  private static getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.WHATSAPP_WORKER_SECRET}`,
      "x-worker-secret": env.WHATSAPP_WORKER_SECRET,
    };
  }

  /**
   * Request the worker to start or restore a Baileys session for the clinic organization.
   */
  public static async connect(
    organizationId: string,
  ): Promise<WorkerConnectResponse> {
    const url = `${this.getBaseUrl()}/api/sessions/${organizationId}/connect`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(
          errorData.message ||
            `Worker connect failed with HTTP ${response.status}`,
        );
      }

      return (await response.json()) as WorkerConnectResponse;
    } catch (err: unknown) {
      // If the worker process is currently starting up or offline, record desired state in DB
      console.warn(
        `[WhatsApp Worker Client] Worker unreachable at ${url}: ${err instanceof Error ? err.message : String(err)}. Falling back to database state.`,
      );

      // Upsert connection record so worker restores it once online
      await db.whatsAppConnection.upsert({
        where: { organizationId },
        update: { status: "CONNECTING" },
        create: {
          organizationId,
          status: "CONNECTING",
        },
      });

      return {
        success: false,
        message:
          "WhatsApp worker process is initializing. Please ensure the persistent worker is running.",
        status: "CONNECTING",
      };
    }
  }

  /**
   * Request the worker to disconnect and unlink the Baileys session for the clinic organization.
   */
  public static async disconnect(
    organizationId: string,
  ): Promise<WorkerDisconnectResponse> {
    const url = `${this.getBaseUrl()}/api/sessions/${organizationId}/disconnect`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(
          errorData.message ||
            `Worker disconnect failed with HTTP ${response.status}`,
        );
      }

      return (await response.json()) as WorkerDisconnectResponse;
    } catch (err: unknown) {
      console.warn(
        `[WhatsApp Worker Client] Direct disconnect RPC to worker failed: ${err instanceof Error ? err.message : String(err)}. Updating DB directly.`,
      );

      // Perform local database cleanup if worker is unreachable
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

      await db.whatsAppAuthState.deleteMany({
        where: { organizationId },
      });

      return {
        success: true,
        message: "Session disconnected and authentication state cleared.",
      };
    }
  }

  /**
   * Get the current WhatsApp connection state for the organization.
   * Checks the worker first for real-time memory state; falls back to the database.
   */
  public static async getStatus(
    organizationId: string,
  ): Promise<WorkerSessionStatusResponse> {
    const url = `${this.getBaseUrl()}/api/sessions/${organizationId}/status`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        return (await response.json()) as WorkerSessionStatusResponse;
      }
    } catch {
      // Worker offline or unreachable — fall through to database
    }

    const conn = await db.whatsAppConnection.findUnique({
      where: { organizationId },
    });

    const state: WhatsAppConnectionState = {
      organizationId,
      status: conn?.status || "DISCONNECTED",
      phoneNumber: conn?.phoneNumber,
      jid: conn?.jid,
      platform: conn?.platform,
      pushName: conn?.pushName,
      qrCode: conn?.qrCode,
      qrExpiresAt: conn?.qrExpiresAt?.toISOString() || null,
      lastConnectedAt: conn?.lastConnectedAt?.toISOString() || null,
      lastDisconnectedAt: conn?.lastDisconnectedAt?.toISOString() || null,
      disconnectReason: conn?.disconnectReason,
    };

    return {
      success: true,
      state,
      isSocketActive: conn?.status === "CONNECTED",
    };
  }
}
