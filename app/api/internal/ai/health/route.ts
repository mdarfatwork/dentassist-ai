import { NextResponse } from "next/server";
import { getAIProviderManager } from "@/lib/ai/manager";

export const dynamic = "force-dynamic";

/**
 * Internal Admin & Health Check endpoint for AI Provider circuits and metrics
 * GET /api/internal/ai/health
 *
 * Exposes circuit states, remaining cooldowns, priorities, models, and metrics.
 * Does NOT expose API keys or patient data.
 */
export async function GET() {
  try {
    const manager = getAIProviderManager();
    const health = manager.getHealthStatus();

    const statusCode =
      health.status === "healthy"
        ? 200
        : health.status === "degraded"
          ? 200
          : 503;

    return NextResponse.json(
      {
        ...health,
        timestamp: new Date().toISOString(),
      },
      { status: statusCode },
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        status: "unavailable",
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
