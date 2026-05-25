import { describe, expect, it, vi } from "vitest";

import {
  runIdempotent,
  shouldReprocess,
  type WebhookEventStore,
} from "@/modules/billing/idempotency";
import type { StripeEventStatus } from "@/lib/db/types";

type Row = { type: string; status: StripeEventStatus; organizationId: string | null; error: string | null };

/** In-memory stand-in for the Supabase-backed ledger. */
function fakeStore(seed: Record<string, Row> = {}) {
  const rows = new Map<string, Row>(Object.entries(seed));
  const store: WebhookEventStore = {
    async insertProcessing(id, type) {
      const existing = rows.get(id);
      if (existing) return existing.status;
      rows.set(id, { type, status: "processing", organizationId: null, error: null });
      return null;
    },
    async markProcessing(id) {
      const r = rows.get(id);
      if (r) {
        r.status = "processing";
        r.error = null;
      }
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

describe("shouldReprocess", () => {
  it("reprocesses anything that has not already succeeded", () => {
    expect(shouldReprocess("processed")).toBe(false);
    expect(shouldReprocess("failed")).toBe(true);
    expect(shouldReprocess("processing")).toBe(true);
  });
});

describe("runIdempotent", () => {
  it("processes a brand-new event exactly once", async () => {
    const { store, rows } = fakeStore();
    const handler = vi.fn(async () => "org-1");

    const out = await runIdempotent(store, "evt_1", "customer.subscription.updated", handler);

    expect(out.status).toBe("processed");
    expect(out.organizationId).toBe("org-1");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(rows.get("evt_1")?.status).toBe("processed");
    expect(rows.get("evt_1")?.organizationId).toBe("org-1");
  });

  it("safely ignores a duplicate of an already-processed event", async () => {
    const { store, rows } = fakeStore({
      evt_dup: { type: "customer.subscription.updated", status: "processed", organizationId: "org-1", error: null },
    });
    const handler = vi.fn(async () => "org-1");

    const out = await runIdempotent(store, "evt_dup", "customer.subscription.updated", handler);

    expect(out.status).toBe("skipped");
    // The side-effecting handler (which writes the audit log) is NOT re-run.
    expect(handler).not.toHaveBeenCalled();
    expect(rows.get("evt_dup")?.status).toBe("processed");
  });

  it("retries a previously-failed event", async () => {
    const { store, rows } = fakeStore({
      evt_fail: { type: "invoice.payment_failed", status: "failed", organizationId: null, error: "boom" },
    });
    const handler = vi.fn(async () => "org-2");

    const out = await runIdempotent(store, "evt_fail", "invoice.payment_failed", handler);

    expect(out.status).toBe("processed");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(rows.get("evt_fail")?.status).toBe("processed");
    expect(rows.get("evt_fail")?.error).toBeNull();
  });

  it("marks an event failed when the handler throws (so it can retry later)", async () => {
    const { store, rows } = fakeStore();
    const handler = vi.fn(async () => {
      throw new Error("downstream error");
    });

    const out = await runIdempotent(store, "evt_err", "customer.subscription.created", handler);

    expect(out.status).toBe("failed");
    expect(rows.get("evt_err")?.status).toBe("failed");
    expect(rows.get("evt_err")?.error).toBe("downstream error");
  });

  it("does not duplicate side effects across redelivery", async () => {
    const { store } = fakeStore();
    const handler = vi.fn(async () => "org-3");

    await runIdempotent(store, "evt_once", "customer.subscription.updated", handler);
    await runIdempotent(store, "evt_once", "customer.subscription.updated", handler);
    await runIdempotent(store, "evt_once", "customer.subscription.updated", handler);

    // Three deliveries, one execution → audit log written once.
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
