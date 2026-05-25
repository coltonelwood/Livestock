import { describe, expect, it, vi } from "vitest";

import {
  runIdempotent,
  type WebhookEventStore,
} from "@/modules/billing/idempotency";
import type { StripeEventStatus } from "@/lib/db/types";

type Row = {
  type: string;
  status: StripeEventStatus;
  organizationId: string | null;
  error: string | null;
  claimedAt: number;
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * In-memory store that models the DB's ATOMIC claim semantics. Each claim
 * method does its check-and-mutate synchronously (no awaits in the middle), so
 * interleaved async callers behave like serialized Postgres row operations.
 */
function fakeStore(seed: Record<string, Row> = {}) {
  const rows = new Map<string, Row>(Object.entries(seed));
  const store: WebhookEventStore = {
    async claimNew(id, type) {
      if (rows.has(id)) return false; // ON CONFLICT DO NOTHING
      rows.set(id, {
        type,
        status: "processing",
        organizationId: null,
        error: null,
        claimedAt: Date.now(),
      });
      return true;
    },
    async claimRetry(id, staleBefore) {
      const r = rows.get(id);
      if (!r) return false;
      const staleMs = new Date(staleBefore).getTime();
      const claimable =
        r.status === "failed" ||
        (r.status === "processing" && r.claimedAt < staleMs);
      if (!claimable) return false;
      r.status = "processing";
      r.error = null;
      r.claimedAt = Date.now();
      return true;
    },
    async getStatus(id) {
      return rows.get(id)?.status ?? null;
    },
    async markProcessed(id, organizationId) {
      const r = rows.get(id);
      if (r) {
        r.status = "processed";
        r.organizationId = organizationId;
      }
    },
    async markFailed(id, organizationId, error) {
      const r = rows.get(id);
      if (r) {
        r.status = "failed";
        r.error = error;
        r.organizationId = organizationId;
      }
    },
  };
  return { store, rows };
}

describe("runIdempotent", () => {
  it("processes a brand-new event exactly once", async () => {
    const { store, rows } = fakeStore();
    const handler = vi.fn(async () => "org-1");

    const out = await runIdempotent(store, "evt_1", "customer.subscription.updated", handler);

    expect(out.status).toBe("processed");
    expect(out.organizationId).toBe("org-1");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(rows.get("evt_1")?.status).toBe("processed");
  });

  it("safely ignores a duplicate of an already-processed event", async () => {
    const { store } = fakeStore({
      evt_dup: { type: "x", status: "processed", organizationId: "org-1", error: null, claimedAt: Date.now() },
    });
    const handler = vi.fn(async () => "org-1");

    const out = await runIdempotent(store, "evt_dup", "x", handler);

    expect(out.status).toBe("skipped");
    expect(out.reason).toBe("duplicate");
    expect(handler).not.toHaveBeenCalled();
  });

  it("retries a previously-failed event", async () => {
    const { store, rows } = fakeStore({
      evt_fail: { type: "invoice.payment_failed", status: "failed", organizationId: null, error: "boom", claimedAt: Date.now() },
    });
    const handler = vi.fn(async () => "org-2");

    const out = await runIdempotent(store, "evt_fail", "invoice.payment_failed", handler);

    expect(out.status).toBe("processed");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(rows.get("evt_fail")?.error).toBeNull();
  });

  it("reclaims a STALE processing row but not a fresh one", async () => {
    const stale = fakeStore({
      evt_stale: { type: "x", status: "processing", organizationId: null, error: null, claimedAt: Date.now() - 60 * 60_000 },
    });
    const staleOut = await runIdempotent(stale.store, "evt_stale", "x", vi.fn(async () => "org"));
    expect(staleOut.status).toBe("processed");

    const fresh = fakeStore({
      evt_fresh: { type: "x", status: "processing", organizationId: null, error: null, claimedAt: Date.now() },
    });
    const freshHandler = vi.fn(async () => "org");
    const freshOut = await runIdempotent(fresh.store, "evt_fresh", "x", freshHandler);
    expect(freshOut.status).toBe("skipped");
    expect(freshOut.reason).toBe("in_progress");
    expect(freshHandler).not.toHaveBeenCalled();
  });

  it("marks an event failed when the handler throws", async () => {
    const { store, rows } = fakeStore();
    const handler = vi.fn(async () => {
      throw new Error("downstream error");
    });

    const out = await runIdempotent(store, "evt_err", "customer.subscription.created", handler);

    expect(out.status).toBe("failed");
    expect(rows.get("evt_err")?.status).toBe("failed");
    expect(rows.get("evt_err")?.error).toBe("downstream error");
  });

  it("runs the handler only ONCE when two deliveries race concurrently", async () => {
    const { store } = fakeStore();
    let running = 0;
    let maxConcurrent = 0;
    const handler = vi.fn(async () => {
      running++;
      maxConcurrent = Math.max(maxConcurrent, running);
      await delay(15);
      running--;
      return "org-c";
    });

    const [a, b] = await Promise.all([
      runIdempotent(store, "evt_race", "customer.subscription.updated", handler),
      runIdempotent(store, "evt_race", "customer.subscription.updated", handler),
    ]);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(maxConcurrent).toBe(1);
    expect([a.status, b.status].sort()).toEqual(["processed", "skipped"]);
  });

  it("does not duplicate side effects across redelivery", async () => {
    const { store } = fakeStore();
    const handler = vi.fn(async () => "org-3");

    await runIdempotent(store, "evt_once", "x", handler);
    await runIdempotent(store, "evt_once", "x", handler);
    await runIdempotent(store, "evt_once", "x", handler);

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
