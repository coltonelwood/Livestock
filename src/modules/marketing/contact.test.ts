import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * BUG-3 regression: the marketing contact / request-demo form must FAIL OPEN and
 * still submit when Upstash/Redis is unavailable, and must preserve typed values
 * on a failed submit.
 */

const h = vi.hoisted(() => ({ insertError: null as unknown, inserts: [] as unknown[] }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: (vals: unknown) => {
        h.inserts.push(vals);
        return Promise.resolve({ error: h.insertError });
      },
    }),
  }),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/request", () => ({ clientIp: () => "9.9.9.9" }));

import { submitContactAction } from "@/modules/marketing/actions";

function form(extra: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("name", "Sam Rancher");
  fd.set("email", "sam@example.com");
  fd.set("business", "Bar 7 Ranch");
  fd.set("message", "Interested in a demo.");
  fd.set("website", ""); // honeypot: real form submits the hidden field as ""
  for (const [k, v] of Object.entries(extra)) fd.set(k, v);
  return fd;
}

describe("submitContactAction — Redis-missing fail-open", () => {
  const original = { ...process.env };
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    h.insertError = null;
    h.inserts = [];
  });
  afterEach(() => {
    process.env = { ...original };
    vi.clearAllMocks();
  });

  it("still submits the contact request when the rate-limit store is unavailable", async () => {
    const res = await submitContactAction({}, form());
    expect(res.success).toBe(true);
    expect(res.error).toBeUndefined();
    expect(h.inserts).toHaveLength(1);
  });

  it("returns an error and preserves values if the insert fails", async () => {
    h.insertError = { message: "db down" };
    const res = await submitContactAction({}, form());
    expect(res.success).toBeUndefined();
    expect(res.error).toBeDefined();
    expect(res.values).toMatchObject({ name: "Sam Rancher", email: "sam@example.com" });
  });
});
