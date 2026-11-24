import { db } from "@/lib/db";
import { getBaileys } from "@/lib/whatsapp/baileys-loader";
import { initDatabaseAuthState } from "@/lib/whatsapp/db-auth-state";
import { ReceptionistService } from "@/lib/receptionist/service";
import pino from "pino";
import qrcode from "qrcode";
import type {
  WhatsAppStatus,
  WhatsAppConnectionState,
} from "@/lib/whatsapp/types";

interface BoomError extends Error {
  output?: {
    statusCode?: number;
    payload?: Record<string, unknown>;
  };
}

interface WASocketSession {
  user?: { id?: string; name?: string };
  ev: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on: (event: string, handler: (arg: any) => void | Promise<void>) => void;
  };
  sendMessage: (jid: string, content: { text: string }) => Promise<unknown>;
  logout: () => Promise<void>;
  end?: (error?: Error) => void;
}

interface ActiveSession {
  sock: WASocketSession;
  organizationId: string;
  isExplicitDisconnect: boolean;
  reconnectAttempts: number;
  qrCode?: string | null;
  qrExpiresAt?: Date | null;
}

/**
 * WhatsApp Session Manager (Node.js Persistent Worker Engine)
 * Manages active Baileys WebSocket connections for all clinics.
 * Guarantees cross-tenant isolation, automatic reconnection with bounded backoff,
 * atomic message deduplication, and integration with the DentAssist AI receptionist.
 */
export class WhatsAppSessionManager {
  private static instance: WhatsAppSessionManager;
  private sessions = new Map<string, ActiveSession>();
  private initLocks = new Set<string>();
  private reconnectTimers = new Map<string, NodeJS.Timeout>();
  private logger = pino({
    level: process.env.NODE_ENV === "test" ? "silent" : "warn",
  });

  private constructor() {}

  public static getInstance(): WhatsAppSessionManager {
    if (!WhatsAppSessionManager.instance) {
      WhatsAppSessionManager.instance = new WhatsAppSessionManager();
    }
    return WhatsAppSessionManager.instance;
  }

  /**
   * Start or restore a Baileys session for the given organization.
   */
  public async startSession(
    organizationId: string,
  ): Promise<{ status: WhatsAppStatus; qrCode?: string | null }> {
    // 1. Prevent concurrent initialization for the same organization
    if (this.initLocks.has(organizationId)) {
      const existing = this.sessions.get(organizationId);
      return {
        status: "CONNECTING",
        qrCode: existing?.qrCode ?? null,
      };
    }

    // 2. Return existing connected session if active
    const existing = this.sessions.get(organizationId);
    if (existing && existing.sock?.user) {
      return {
        status: "CONNECTED",
        qrCode: null,
      };
    }

    // Safely tear down previous inactive socket to avoid duplicate listeners
    if (existing?.sock) {
      try {
        existing.isExplicitDisconnect = true;
        existing.sock.end?.(undefined);
      } catch {
        // ignore error during cleanup
      }
      this.sessions.delete(organizationId);
    }

    this.initLocks.add(organizationId);

    // Clear any pending reconnect timer
    const existingTimer = this.reconnectTimers.get(organizationId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.reconnectTimers.delete(organizationId);
    }

    try {
      // 3. Update DB connection state to CONNECTING
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

      // 4. Initialize database-backed auth state
      const { state, saveCreds, clearAuthState } =
        await initDatabaseAuthState(organizationId);

      // 5. Load Baileys module and socket factory
      const {
        default: makeWASocket,
        DisconnectReason,
        makeCacheableSignalKeyStore,
      } = await getBaileys();

      const socketLogger = this.logger.child({ organizationId });

      const sock = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, socketLogger),
        },
        logger: socketLogger,
        printQRInTerminal: false,
        syncFullHistory: false,
        markOnlineOnConnect: false,
        browser: ["DentAssist AI", "Chrome", "1.0.0"],
      }) as unknown as WASocketSession;

      const sessionInstance: ActiveSession = {
        sock,
        organizationId,
        isExplicitDisconnect: false,
        reconnectAttempts: existing?.reconnectAttempts || 0,
        qrCode: null,
        qrExpiresAt: null,
      };

      this.sessions.set(organizationId, sessionInstance);

      // 6. Listen for credential updates
      sock.ev.on("creds.update", async () => {
        try {
          await saveCreds();
        } catch (err) {
          console.error(
            `[WhatsApp Manager] Failed to save creds for org ${organizationId}:`,
            err instanceof Error ? err.message : String(err),
          );
        }
      });

      // 7. Handle connection updates (QR, open, close)
      sock.ev.on(
        "connection.update",
        async (update: {
          connection?: "open" | "close" | "connecting";
          lastDisconnect?: { error?: Error | BoomError };
          qr?: string;
        }) => {
          const { connection, lastDisconnect, qr } = update;

          // QR emitted
          if (qr) {
            try {
              const qrDataUrl = await qrcode.toDataURL(qr, {
                margin: 2,
                scale: 8,
              });
              const expiresAt = new Date(Date.now() + 60000); // 60s validity

              sessionInstance.qrCode = qrDataUrl;
              sessionInstance.qrExpiresAt = expiresAt;

              await db.whatsAppConnection.upsert({
                where: { organizationId },
                update: {
                  status: "AWAITING_SCAN",
                  qrCode: qrDataUrl,
                  qrExpiresAt: expiresAt,
                },
                create: {
                  organizationId,
                  status: "AWAITING_SCAN",
                  qrCode: qrDataUrl,
                  qrExpiresAt: expiresAt,
                },
              });
            } catch (err) {
              console.error(
                `[WhatsApp Manager] Failed to render QR code for org ${organizationId}:`,
                err,
              );
            }
          }

          // Socket connected successfully
          if (connection === "open") {
            sessionInstance.reconnectAttempts = 0;
            sessionInstance.qrCode = null;
            sessionInstance.qrExpiresAt = null;

            const userJid = sock.user?.id || "";
            const phoneNumber = userJid.split(":")[0]?.split("@")[0] || null;
            const pushName = sock.user?.name || null;

            await db.whatsAppConnection.upsert({
              where: { organizationId },
              update: {
                status: "CONNECTED",
                phoneNumber,
                jid: userJid,
                pushName,
                qrCode: null,
                qrExpiresAt: null,
                lastConnectedAt: new Date(),
                disconnectReason: null,
              },
              create: {
                organizationId,
                status: "CONNECTED",
                phoneNumber,
                jid: userJid,
                pushName,
                lastConnectedAt: new Date(),
              },
            });

            this.initLocks.delete(organizationId);
          }

          // Socket closed
          if (connection === "close") {
            this.initLocks.delete(organizationId);

            const statusCode = (lastDisconnect?.error as BoomError)?.output
              ?.statusCode;
            const isLoggedOut = statusCode === DisconnectReason.loggedOut;

            if (isLoggedOut || sessionInstance.isExplicitDisconnect) {
              // Complete teardown on loggedOut or explicit user disconnect
              this.sessions.delete(organizationId);

              await db.whatsAppConnection.upsert({
                where: { organizationId },
                update: {
                  status: "DISCONNECTED",
                  qrCode: null,
                  qrExpiresAt: null,
                  lastDisconnectedAt: new Date(),
                  disconnectReason: isLoggedOut
                    ? "Logged out from device"
                    : "Explicit disconnect",
                },
                create: {
                  organizationId,
                  status: "DISCONNECTED",
                  disconnectReason: isLoggedOut
                    ? "Logged out from device"
                    : "Explicit disconnect",
                  lastDisconnectedAt: new Date(),
                },
              });

              await clearAuthState();
            } else {
              // Transient disconnect: schedule reconnection with bounded exponential backoff
              const attempts = sessionInstance.reconnectAttempts + 1;
              sessionInstance.reconnectAttempts = attempts;

              // Backoff: 1s, 2s, 4s, 8s, up to max 30s + small jitter
              const delay = Math.min(
                1000 * Math.pow(2, attempts - 1) + Math.random() * 500,
                30000,
              );

              await db.whatsAppConnection.upsert({
                where: { organizationId },
                update: {
                  status: attempts > 6 ? "FAILED" : "CONNECTING",
                  disconnectReason: `Connection lost (${statusCode || "network"}). Reconnecting attempt ${attempts}...`,
                  lastDisconnectedAt: new Date(),
                },
                create: {
                  organizationId,
                  status: "CONNECTING",
                  lastDisconnectedAt: new Date(),
                },
              });

              if (attempts <= 6) {
                const timer = setTimeout(() => {
                  this.startSession(organizationId).catch((err) =>
                    console.error(
                      `[WhatsApp Manager] Reconnect failed for ${organizationId}:`,
                      err,
                    ),
                  );
                }, delay);

                this.reconnectTimers.set(organizationId, timer);
              }
            }
          }
        },
      );

      // 8. Handle incoming messages via messages.upsert
      sock.ev.on(
        "messages.upsert",
        async (m: {
          type: string;
          messages: Array<{
            key?: {
              fromMe?: boolean;
              remoteJid?: string;
              id?: string;
              participant?: string;
            };
            message?: {
              conversation?: string;
              extendedTextMessage?: { text?: string };
            };
          }>;
        }) => {
          if (m.type !== "notify" || !m.messages?.length) return;

          for (const msg of m.messages) {
            try {
              // Filter 1: Ignore messages sent by ourselves
              if (msg.key?.fromMe) continue;

              // Filter 2: Ignore group messages
              const remoteJid = msg.key?.remoteJid || "";
              if (!remoteJid || remoteJid.endsWith("@g.us")) continue;

              // Filter 3: Ignore broadcast / status updates
              if (
                remoteJid === "status@broadcast" ||
                remoteJid.includes("broadcast")
              )
                continue;

              const messageId = msg.key?.id;
              if (!messageId) continue;

              // Filter 4: Extract text safely
              const text = (
                msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text ||
                ""
              ).trim();

              if (!text) continue;

              // Filter 5: Atomic deduplication via Prisma
              try {
                await db.whatsAppProcessedMessage.create({
                  data: {
                    organizationId,
                    messageId,
                    remoteJid,
                    senderJid: msg.key?.participant || remoteJid,
                  },
                });
              } catch (dbErr: unknown) {
                // Unique constraint violation (P2002) means already processed
                if (
                  typeof dbErr === "object" &&
                  dbErr !== null &&
                  "code" in dbErr &&
                  (dbErr as { code?: string }).code === "P2002"
                ) {
                  continue;
                }
                throw dbErr;
              }

              // 9. Route through existing AI Receptionist
              const receptionistResponse =
                await ReceptionistService.processMessage({
                  organizationId,
                  message: text,
                  channel: "chat",
                });

              const replyText =
                receptionistResponse.reply ||
                "Thank you for contacting our clinic. How may we assist you with your dental care today?";

              // 10. Send reply through Baileys socket
              await sock.sendMessage(remoteJid, { text: replyText });
            } catch (msgErr: unknown) {
              console.error(
                `[WhatsApp Manager] Error processing message for org ${organizationId}:`,
                msgErr instanceof Error ? msgErr.message : "Internal error",
              );
            }
          }
        },
      );

      this.initLocks.delete(organizationId);

      return {
        status: "CONNECTING",
        qrCode: sessionInstance.qrCode,
      };
    } catch (err: unknown) {
      this.initLocks.delete(organizationId);
      console.error(
        `[WhatsApp Manager] Failed to initialize socket for org ${organizationId}:`,
        err instanceof Error ? err.message : String(err),
      );

      await db.whatsAppConnection.upsert({
        where: { organizationId },
        update: {
          status: "FAILED",
          disconnectReason:
            err instanceof Error ? err.message : "Initialization failed",
        },
        create: {
          organizationId,
          status: "FAILED",
          disconnectReason:
            err instanceof Error ? err.message : "Initialization failed",
        },
      });

      return {
        status: "FAILED",
      };
    }
  }

  /**
   * Disconnect and purge an organization's WhatsApp session.
   */
  public async disconnectSession(
    organizationId: string,
  ): Promise<{ success: boolean; message: string }> {
    // Clear any reconnect timer
    const timer = this.reconnectTimers.get(organizationId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(organizationId);
    }

    const session = this.sessions.get(organizationId);
    if (session) {
      session.isExplicitDisconnect = true;
      try {
        if (session.sock) {
          await session.sock.logout().catch(() => {});
          session.sock.end?.(undefined);
        }
      } catch (err) {
        console.warn(
          `[WhatsApp Manager] Socket logout warning for org ${organizationId}:`,
          err,
        );
      }
      this.sessions.delete(organizationId);
    }

    // Clear state in database
    await db.whatsAppConnection.upsert({
      where: { organizationId },
      update: {
        status: "DISCONNECTED",
        qrCode: null,
        qrExpiresAt: null,
        lastDisconnectedAt: new Date(),
        disconnectReason: "Manually disconnected by user",
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
      message: "WhatsApp session disconnected successfully.",
    };
  }

  /**
   * Get the real-time status of a session.
   */
  public async getSessionStatus(
    organizationId: string,
  ): Promise<WhatsAppConnectionState> {
    const session = this.sessions.get(organizationId);
    const conn = await db.whatsAppConnection.findUnique({
      where: { organizationId },
    });

    const isConnected = !!(session?.sock?.user || conn?.status === "CONNECTED");

    return {
      organizationId,
      status: isConnected
        ? "CONNECTED"
        : conn?.status || (session ? "CONNECTING" : "DISCONNECTED"),
      phoneNumber: conn?.phoneNumber,
      jid: conn?.jid,
      platform: conn?.platform,
      pushName: conn?.pushName,
      qrCode: session?.qrCode ?? conn?.qrCode ?? null,
      qrExpiresAt:
        session?.qrExpiresAt?.toISOString() ??
        conn?.qrExpiresAt?.toISOString() ??
        null,
      lastConnectedAt: conn?.lastConnectedAt?.toISOString() ?? null,
      lastDisconnectedAt: conn?.lastDisconnectedAt?.toISOString() ?? null,
      disconnectReason: conn?.disconnectReason ?? null,
    };
  }

  /**
   * Check if a socket is active in memory.
   */
  public isSocketActive(organizationId: string): boolean {
    const session = this.sessions.get(organizationId);
    return !!session?.sock;
  }

  /**
   * Restore all previously connected sessions on worker process startup.
   */
  public async restoreAllSessions(): Promise<void> {
    const activeConnections = await db.whatsAppConnection.findMany({
      where: {
        status: {
          in: ["CONNECTED", "CONNECTING"],
        },
      },
    });

    console.log(
      `[WhatsApp Manager] Found ${activeConnections.length} active sessions to restore...`,
    );

    for (const conn of activeConnections) {
      try {
        console.log(
          `[WhatsApp Manager] Restoring session for org: ${conn.organizationId}`,
        );
        await this.startSession(conn.organizationId);
      } catch (err) {
        console.error(
          `[WhatsApp Manager] Failed to restore session for org ${conn.organizationId}:`,
          err,
        );
      }
    }
  }

  /**
   * Graceful shutdown of all active sockets.
   */
  public async shutdown(): Promise<void> {
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.reconnectTimers.clear();

    for (const session of this.sessions.values()) {
      try {
        session.isExplicitDisconnect = true;
        session.sock?.end?.(undefined);
      } catch {
        // ignore on exit
      }
    }
    this.sessions.clear();
  }
}
