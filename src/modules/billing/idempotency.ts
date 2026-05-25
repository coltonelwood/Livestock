import type { StripeEventStatus } from "@/lib/db/types";

/**
 * Webhook idempotency. The Stripe event id is the dedup key. A store records
 * each event's processing status so retries of an already-processed event are
 * skipped (and side effects like audit logs are not duplicated), while
 * previously-failed events are allowed to reprocess on the next Stripe retry.
 */
export interface WebhookEventStore {
  /**
   * Atomically claim an event for processing. Returns the EXISTING status if
   * the event was already recorded, or `null` if this call freshly inserted a
   * `processing` row (i.e. it's the first time we've seen this event).
   */
  insertProcessing(id: string, type: string): Promise<StripeEventStatus | null>;
  markProcessing(id: string): Promise<void>;
  markProcessed(id: string, organizationId: string | null): Promise<void>;
  markFailed(id: string, organizationId: string | null, error: string): Promise<void>;
}

/** A previously-seen event should be reprocessed unless it already succeeded. */
export function shouldReprocess(existing: StripeEventStatus): boolean {
  return existing !== "processed";
}

export type IdempotentOutcome = {
  status: "processed" | "skipped" | "failed";
  organizationId: string | null;
};

/**
 * Run `handler` exactly once per event id. The handler returns the discovered
 * organization id (or null) and performs the real side effects.
 */
export async function runIdempotent(
  store: WebhookEventStore,
  eventId: string,
  eventType: string,
  handler: () => Promise<string | null>,
): Promise<IdempotentOutcome> {
  const existing = await store.insertProcessing(eventId, eventType);

  if (existing !== null) {
    if (!shouldReprocess(existing)) {
      // Already processed — idempotent no-op (no handler, no duplicate audit).
      return { status: "skipped", organizationId: null };
    }
    // Failed or stuck-in-processing → retry.
    await store.markProcessing(eventId);
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
