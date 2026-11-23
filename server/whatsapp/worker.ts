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

import http from "node:http";
import { env } from "@/config/env";
import { WhatsAppSessionManager } from "./session-manager";

const PORT = env.WHATSAPP_WORKER_PORT || 3001;
const SECRET = env.WHATSAPP_WORKER_SECRET;

const sessionManager = WhatsAppSessionManager.getInstance();

/**
 * Authenticate incoming requests to the internal worker API.
 */
function isAuthorized(req: http.IncomingMessage): boolean {
  const authHeader = req.headers.authorization;
  const workerSecretHeader = req.headers["x-worker-secret"];

  if (workerSecretHeader && workerSecretHeader === SECRET) {
    return true;
  }

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    return token === SECRET;
  }

  return false;
}

/**
 * Send JSON response helper.
 */
function sendJson(
  res: http.ServerResponse,
  statusCode: number,
  data: Record<string, unknown>,
) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, x-worker-secret",
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url || "/", `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;
  const method = req.method?.toUpperCase();

  // Handle CORS preflight
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, x-worker-secret",
    });
    res.end();
    return;
  }

  // Public Health Check Endpoint
  if (pathname === "/health" && method === "GET") {
    sendJson(res, 200, {
      status: "healthy",
      service: "dentassist-whatsapp-worker",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Enforce Worker Secret Authentication for all session management RPCs
  if (!isAuthorized(req)) {
    sendJson(res, 401, {
      success: false,
      message: "Unauthorized: Invalid or missing worker secret.",
    });
    return;
  }

  // Route: POST /api/sessions/:orgId/connect
  const connectMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/connect$/);
  if (connectMatch && method === "POST") {
    const organizationId = decodeURIComponent(connectMatch[1]);
    try {
      const result = await sessionManager.startSession(organizationId);
      sendJson(res, 200, {
        success: true,
        message: "Session connection initiated.",
        status: result.status,
        qrCode: result.qrCode,
      });
    } catch (err: unknown) {
      sendJson(res, 500, {
        success: false,
        message: err instanceof Error ? err.message : "Connect failed",
      });
    }
    return;
  }

  // Route: POST /api/sessions/:orgId/disconnect
  const disconnectMatch = pathname.match(
    /^\/api\/sessions\/([^/]+)\/disconnect$/,
  );
  if (disconnectMatch && method === "POST") {
    const organizationId = decodeURIComponent(disconnectMatch[1]);
    try {
      const result = await sessionManager.disconnectSession(organizationId);
      sendJson(res, 200, result);
    } catch (err: unknown) {
      sendJson(res, 500, {
        success: false,
        message: err instanceof Error ? err.message : "Disconnect failed",
      });
    }
    return;
  }

  // Route: GET /api/sessions/:orgId/status
  const statusMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/status$/);
  if (statusMatch && method === "GET") {
    const organizationId = decodeURIComponent(statusMatch[1]);
    try {
      const state = await sessionManager.getSessionStatus(organizationId);
      sendJson(res, 200, {
        success: true,
        state,
        isSocketActive: sessionManager.isSocketActive(organizationId),
      });
    } catch (err: unknown) {
      sendJson(res, 500, {
        success: false,
        message: err instanceof Error ? err.message : "Status fetch failed",
      });
    }
    return;
  }

  sendJson(res, 404, {
    success: false,
    message: "Endpoint not found",
  });
});

async function start() {
  server.listen(PORT, async () => {
    console.log(`\n=======================================================`);
    console.log(`  DentAssist AI WhatsApp Worker started on port ${PORT}`);
    console.log(`  Worker Endpoint: http://localhost:${PORT}`);
    console.log(`=======================================================\n`);

    // Automatically restore active sessions from database
    await sessionManager.restoreAllSessions();
  });

  const handleShutdown = async (signal: string) => {
    console.log(
      `\nReceived ${signal}. Shutting down WhatsApp worker cleanly...`,
    );
    server.close();
    await sessionManager.shutdown();
    process.exit(0);
  };

  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
}

start().catch((err) => {
  console.error("Failed to start WhatsApp worker:", err);
  process.exit(1);
});
