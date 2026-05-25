import { describe, expect, it } from "vitest";

import {
  enforce,
  rateLimit,
  LIMITS,
  type RateStore,
} from "@/lib/ratelimit";

/** In-memory stand-in for Upstash Redis (fixed-window counter semantics). */
function fakeStore(): RateStore & { hits: Map<string, number> } {
  const hits = new Map<string, number>();
  return {
    hits,
    async incr(key) {
      const next = (hits.get(key) ?? 0) + 1;
      hits.set(key, next);
      return next;
    },
    async pexpire() {
      return 1;
    },
  };
}

describe("rateLimit", () => {
  it("allows requests under the limit", async () => {
    const store = fakeStore();
    const first = await rateLimit("publicChat", "1.1.1.1", store);
    expect(first.status).toBe("ok");
    if (first.status === "ok") {
      expect(first.limit).toBe(LIMITS.publicChat.limit);
      expect(first.remaining).toBe(LIMITS.publicChat.limit - 1);
    }
  });

  it("blocks requests once the limit is exceeded", async () => {
    const store = fakeStore();
    const limit = LIMITS.publicChat.limit;
    let last = await rateLimit("publicChat", "2.2.2.2", store);
    for (let i = 1; i < limit; i++) {
      last = await rateLimit("publicChat", "2.2.2.2", store);
    }
    expect(last.status).toBe("ok"); // exactly at the limit is still ok
    const overflow = await rateLimit("publicChat", "2.2.2.2", store);
    expect(overflow.status).toBe("limited");
    if (overflow.status === "limited") {
      expect(overflow.remaining).toBe(0);
      expect(overflow.retryAfterMs).toBe(LIMITS.publicChat.windowMs);
    }
  });

  it("isolates buckets per IP", async () => {
    const store = fakeStore();
    // Exhaust IP A entirely.
    for (let i = 0; i < LIMITS.publicChat.limit + 1; i++) {
      await rateLimit("publicChat", "10.0.0.1", store);
    }
    const blockedA = await rateLimit("publicChat", "10.0.0.1", store);
    expect(blockedA.status).toBe("limited");

    // A different IP is unaffected.
    const freshB = await rateLimit("publicChat", "10.0.0.2", store);
    expect(freshB.status).toBe("ok");
  });

  it("isolates buckets per org/widget", async () => {
    const store = fakeStore();
    for (let i = 0; i < LIMITS.orgChat.limit + 1; i++) {
      await rateLimit("orgChat", "org-a", store);
    }
    const blocked = await rateLimit("orgChat", "org-a", store);
    expect(blocked.status).toBe("limited");

    const other = await rateLimit("orgChat", "org-b", store);
    expect(other.status).toBe("ok");
  });

  it("reports unavailable when the store is missing (null)", async () => {
    const result = await rateLimit("publicChat", "3.3.3.3", null);
    expect(result.status).toBe("unavailable");
  });

  it("reports unavailable when the store throws", async () => {
    const broken: RateStore = {
      async incr() {
        throw new Error("redis down");
      },
      async pexpire() {
        return 1;
      },
    };
    const result = await rateLimit("publicChat", "4.4.4.4", broken);
    expect(result.status).toBe("unavailable");
  });
});

describe("enforce", () => {
  it("allows when all buckets pass", async () => {
    const store = fakeStore();
    const r = await enforce(
      [
        { name: "publicChat", identifier: "9.9.9.9" },
        { name: "orgChat", identifier: "org-z" },
      ],
      { failOpen: false },
      store,
    );
    expect(r.allowed).toBe(true);
  });

  it("blocks (and short-circuits) when any bucket is limited", async () => {
    const store = fakeStore();
    for (let i = 0; i < LIMITS.publicChat.limit + 1; i++) {
      await rateLimit("publicChat", "8.8.8.8", store);
    }
    const r = await enforce(
      [{ name: "publicChat", identifier: "8.8.8.8" }],
      { failOpen: false },
      store,
    );
    expect(r.allowed).toBe(false);
    expect(r.limited).toBe(true);
  });

  it("fails CLOSED for public endpoints when the store is unavailable", async () => {
    const r = await enforce(
      [{ name: "publicChat", identifier: "1.2.3.4" }],
      { failOpen: false },
      null,
    );
    expect(r.allowed).toBe(false);
    expect(r.unavailable).toBe(true);
  });

  it("fails OPEN for authenticated dashboard when the store is unavailable", async () => {
    const r = await enforce(
      [{ name: "authedChat", identifier: "user:org" }],
      { failOpen: true },
      null,
    );
    expect(r.allowed).toBe(true);
    expect(r.unavailable).toBe(true);
  });
});
