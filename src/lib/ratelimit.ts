import "server-only";

import { Redis } from "@upstash/redis";

/**
 * Durable, multi-dimensional rate limiting backed by Upstash Redis.
 *
 * Algorithm: fixed-window counter (INCR + PEXPIRE). It's simple, atomic enough
 * for our needs, and—crucially—testable offline by injecting a fake store.
 * (Trade-off: a fixed window allows up to ~2x the limit across a boundary. For
 * these limits that's acceptable; swap in @upstash/ratelimit's sliding window
 * later if stricter shaping is needed.)
 *
 * Configuration is read lazily from UPSTASH_REDIS_REST_URL /
 * UPSTASH_REDIS_REST_TOKEN. When unconfigured (or on a Redis error) the limiter
 * reports `unavailable` and each call site decides whether to fail open or
 * closed.
 */

/** Minimal slice of the Redis API this limiter needs (for DI in tests). */
export interface RateStore {
  incr(key: string): Promise<number>;
  pexpire(key: string, ms: number): Promise<unknown>;
}

export const LIMITS = {
  // Public AI chat, keyed per IP. Strict — every call costs model tokens.
  publicChat: { limit: 8, windowMs: 60_000, prefix: "rl:chat:ip" },
  // Aggregate cap per org/widget so one storefront can't become a cost sink.
  orgChat: { limit: 120, windowMs: 60_000, prefix: "rl:chat:org" },
  // Authenticated dashboard test panel — generous, keyed per user+org.
  authedChat: { limit: 60, windowMs: 60_000, prefix: "rl:chat:auth" },
  // Public inquiry/lead capture — block spam without blocking real buyers.
  inquiry: { limit: 6, windowMs: 600_000, prefix: "rl:inquiry" },
  // Marketing demo/contact form.
  contact: { limit: 4, windowMs: 3_600_000, prefix: "rl:contact" },
  // Authenticated auction bidding — anti-spam, per user.
  bid: { limit: 40, windowMs: 60_000, prefix: "rl:bid" },
} as const;

export type LimiterName = keyof typeof LIMITS;

export type RateResult =
  | { status: "ok"; limit: number; remaining: number }
  | { status: "limited"; limit: number; remaining: 0; retryAfterMs: number }
  | { status: "unavailable" };

let cachedStore: RateStore | null | undefined;

/** Returns the configured Redis store, or null if env vars are absent. */
export function getStore(): RateStore | null {
  if (cachedStore !== undefined) return cachedStore;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  cachedStore =
    url && token ? (new Redis({ url, token }) as unknown as RateStore) : null;
  return cachedStore;
}

/** For tests: reset the memoized store. */
export function __resetStoreForTests() {
  cachedStore = undefined;
}

/**
 * Increment and evaluate a single rate-limit bucket. Pass `storeOverride` to
 * inject a store in tests; pass `null` explicitly to simulate "unconfigured".
 */
export async function rateLimit(
  name: LimiterName,
  identifier: string,
  storeOverride?: RateStore | null,
): Promise<RateResult> {
  const store = storeOverride === undefined ? getStore() : storeOverride;
  if (!store) return { status: "unavailable" };

  const cfg = LIMITS[name];
  const windowStart = Math.floor(Date.now() / cfg.windowMs);
  const key = `${cfg.prefix}:${identifier}:${windowStart}`;

  try {
    const count = await store.incr(key);
    if (count === 1) await store.pexpire(key, cfg.windowMs);
    if (count > cfg.limit) {
      return {
        status: "limited",
        limit: cfg.limit,
        remaining: 0,
        retryAfterMs: cfg.windowMs,
      };
    }
    return { status: "ok", limit: cfg.limit, remaining: cfg.limit - count };
  } catch {
    // Redis unreachable — don't let the limiter take the app down.
    return { status: "unavailable" };
  }
}

export type EnforceResult = {
  allowed: boolean;
  limited: boolean;
  unavailable: boolean;
  retryAfterMs?: number;
};

/**
 * Enforce several buckets at once (e.g. per-IP AND per-org). All must pass.
 * `failOpen` decides behavior when the store is unavailable:
 *   - false (public AI): fail CLOSED — deny when we can't verify.
 *   - true  (authed dashboard): fail OPEN — don't block legitimate users.
 */
export async function enforce(
  checks: { name: LimiterName; identifier: string }[],
  opts: { failOpen: boolean },
  storeOverride?: RateStore | null,
): Promise<EnforceResult> {
  let unavailable = false;
  for (const check of checks) {
    const result = await rateLimit(check.name, check.identifier, storeOverride);
    if (result.status === "limited") {
      return {
        allowed: false,
        limited: true,
        unavailable: false,
        retryAfterMs: result.retryAfterMs,
      };
    }
    if (result.status === "unavailable") unavailable = true;
  }
  if (unavailable) {
    return { allowed: opts.failOpen, limited: false, unavailable: true };
  }
  return { allowed: true, limited: false, unavailable: false };
}
