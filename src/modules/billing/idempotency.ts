import type { StripeEventStatus } from "@/lib/db/types";

/**
 * Webhook idempotency. The Stripe event id is the dedup key. Claiming is atomic
 * at the database level so two simultaneous deliveries of the same event can
 * never both run the handler:
 *
 *  - `claimNew` is an INSERT ... ON CONFLICT DO NOTHING RETURNING. Exactly one
 *    caller inserts the row (owns the event); a concurrent caller gets nothing.
 *  - `claimRetry` is a conditional UPDATE ... RETURNING that flips a `failed`
 *    (or stale `processing`) row back to `processing`. Postgres row locking
 *    means only one concurrent UPDATE can match-and-flip.
 *
 * If neither claim succeeds the event is already done or actively in flight, so
 * we skip safely (and never duplicate side effects like audit logs).
 */
export interface WebhookEventStore {
  /** INSERT ... ON CONFLICT DO NOTHING RETURNING → true iff this call inserted. */
  claimNew(id: string, type: string): Promise<boolean>;
  /**
   * Conditionally claim an existing event for retry: a `failed` row, or a
   * `processing` row whose claim is older than `staleBefore`. Returns true iff
   * THIS call won the claim.
   */
  claimRetry(id: string, staleBefore: string): Promise<boolean>;
  getStatus(id: string): Promise<StripeEventStatus | null>;
  markProcessed(id: string, organizationId: string | null): Promise<void>;
  markFailed(id: string, organizationId: string | null, error: string): Promise<void>;
}

/** A `processing` row older than this is considered stale (handler crashed). */
export const DEFAULT_STALE_MS = 5 * 60_000;

export type IdempotentOutcome = {
  status: "processed" | "skipped" | "failed";
  organizationId: string | null;
  /** When skipped: why. `duplicate` = already processed; `in_progress` = another worker holds it. */
  reason?: "duplicate" | "in_progress";
};

/**
 * Run `handler` at most once per event id. The handler returns the discovered
 * organization id (or null) and performs the real side effects.
 */
export async function runIdempotent(
  store: WebhookEventStore,
  eventId: string,
  eventType: string,
  handler: () => Promise<string | null>,
  opts?: { staleMs?: number },
): Promise<IdempotentOutcome> {
  // 1. Try to own a brand-new event (atomic insert).
  let owns = await store.claimNew(eventId, eventType);

  // 2. Otherwise try to claim it for retry (atomic conditional update).
  if (!owns) {
    const staleBefore = new Date(
      Date.now() - (opts?.staleMs ?? DEFAULT_STALE_MS),
    ).toISOString();
    owns = await store.claimRetry(eventId, staleBefore);
  }

  // 3. Couldn't claim → already processed, or actively in flight elsewhere.
  if (!owns) {
    const existing = await store.getStatus(eventId);
    return {
      status: "skipped",
      organizationId: null,
      reason: existing === "processed" ? "duplicate" : "in_progress",
    };
  }

  try {
    const organizationId = await handler();
    await store.markProcessed(eventId, organizationId);
    return { status: "processed", organizationId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "processing_error";
    await store.markFailed(eventId, null, message);
    return { status: "failed", organizationId: null };
  }
}
