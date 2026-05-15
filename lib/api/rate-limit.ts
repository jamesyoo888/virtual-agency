import { NextResponse } from "next/server";

/**
 * Per-key request-rate limiter using a fixed-window in-memory store.
 *
 * Trade-off: each serverless instance has its own counter, so a burst spread
 * across N instances can collectively exceed the nominal limit by Nx. That's
 * acceptable for our threat model (preventing UI key-mashing / cheap abuse on
 * paid endpoints); for stricter limits route through the cost cap, which is
 * shared via the DB.
 *
 * If we ever outgrow this we should swap to an Upstash bucket (or Postgres
 * advisory lock) without touching call sites.
 */

interface Counter {
  count: number;
  resetAt: number;
}

const g = global as typeof global & {
  __vaRateBuckets?: Map<string, Counter>;
};
if (!g.__vaRateBuckets) g.__vaRateBuckets = new Map();
const buckets = g.__vaRateBuckets;

export interface RateLimitConfig {
  /** Logical bucket name, e.g. "image" or "video". */
  key: string;
  /** Per-key identifier, typically user_id or ip address. */
  subject: string;
  /** Maximum number of calls allowed within the window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
}

export function takeToken(cfg: RateLimitConfig): RateLimitResult {
  const id = `${cfg.key}::${cfg.subject}`;
  const now = Date.now();
  const existing = buckets.get(id);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + cfg.windowMs;
    buckets.set(id, { count: 1, resetAt });
    return {
      ok: true,
      remaining: cfg.limit - 1,
      resetAt,
      retryAfterSec: Math.ceil(cfg.windowMs / 1000),
    };
  }

  if (existing.count >= cfg.limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSec: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: cfg.limit - existing.count,
    resetAt: existing.resetAt,
    retryAfterSec: Math.ceil((existing.resetAt - now) / 1000),
  };
}

/**
 * Convenience wrapper that returns a 429 response if the rate limit was hit,
 * or null if the call may proceed. Mirrors the `enforceCaps` shape so paid
 * routes can chain them: rate limit → cost cap → execute → record.
 */
export function enforceRateLimit(
  cfg: RateLimitConfig
): NextResponse | null {
  const r = takeToken(cfg);
  if (r.ok) return null;
  return NextResponse.json(
    {
      error: "Too many requests",
      retry_after_seconds: r.retryAfterSec,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(r.retryAfterSec),
        "X-RateLimit-Limit": String(cfg.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(r.resetAt / 1000)),
      },
    }
  );
}

/** Reset every bucket — exposed for tests. */
export function _resetRateBuckets(): void {
  buckets.clear();
}
