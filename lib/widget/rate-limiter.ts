/**
 * In-memory sliding-window rate limiter for public widget endpoints.
 * Protects against scraping, denial-of-service, and resource exhaustion.
 */

interface RateLimitRecord {
  timestamps: number[];
}

class SlidingWindowRateLimiter {
  private records = new Map<string, RateLimitRecord>();
  private lastPrune = Date.now();

  /**
   * Evaluates if a request identified by key is allowed within windowMs.
   */
  public check(
    key: string,
    limit: number,
    windowMs: number,
  ): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
    const now = Date.now();
    this.maybePrune(now, windowMs);

    let record = this.records.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.records.set(key, record);
    }

    const windowStart = now - windowMs;
    // Keep only timestamps within current window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= limit) {
      const oldestInWindow = record.timestamps[0];
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((oldestInWindow + windowMs - now) / 1000),
      );
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
      };
    }

    record.timestamps.push(now);
    return {
      allowed: true,
      remaining: limit - record.timestamps.length,
      retryAfterSeconds: 0,
    };
  }

  /**
   * Periodically garbage-collects expired rate limit records.
   */
  private maybePrune(now: number, windowMs: number) {
    if (now - this.lastPrune < 60000) return; // Prune once per minute max
    this.lastPrune = now;

    const expiryThreshold = now - windowMs * 2;
    for (const [key, record] of this.records.entries()) {
      record.timestamps = record.timestamps.filter(
        (ts) => ts > expiryThreshold,
      );
      if (record.timestamps.length === 0) {
        this.records.delete(key);
      }
    }
  }

  public reset() {
    this.records.clear();
  }
}

export const widgetRateLimiter = new SlidingWindowRateLimiter();

export const WIDGET_RATE_LIMITS = {
  CONFIG_PER_MINUTE: 60,
  SESSION_PER_MINUTE: 15,
  MESSAGES_PER_MINUTE: 25,
};
