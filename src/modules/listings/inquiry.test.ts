import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * BUG-1 regression: when Upstash/Redis is unavailable, the public inquiry form
 * must FAIL OPEN and still create the lead (never silently drop a real buyer),
 * and a genuine lead-write failure must return a clear error while preserving
 * the buyer's typed values.
 */

const h = vi.hoisted(() => ({ admin: null as unknown as { from: (t: string) => unknown } }));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => h.admin }));
vi.mock("@/lib/notifications/enqueue", () => ({ enqueueNotification: vi.fn(async () => {}) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/request", () => ({ clientIp: () => "1.2.3.4" }));

import { submitInquiryAction } from "@/modules/listings/actions";

const LISTING_ID = "11111111-1111-1111-1111-111111111111";

function makeAdmin({
  status = "active",
  leadError = null as unknown,
}: { status?: string; leadError?: unknown } = {}) {
  const inserts: Record<string, unknown[]> = {};
  function from(table: string) {
    const b: Record<string, unknown> = {
      select: () => b,
      eq: () => b,
      insert: (vals: unknown) => {
        (inserts[table] ||= []).push(vals);
        return b;
      },
      maybeSingle: async () => {
        if (table === "livestock_listings" || table === "meat_products")
          return { data: { id: LISTING_ID, organization_id: "org-1", status }, error: null };
        if (table === "ranch_profiles")
          return { data: { display_name: "Cross Creek", email: "seller@example.com" }, error: null };
        return { data: null, error: null };
      },
      single: async () => {
        if (table === "leads")
          return leadError ? { data: null, error: leadError } : { data: { id: "lead-1" }, error: null };
        return { data: null, error: null };
      },
      // Thenable so `await admin.from(t).insert(...)` (no .single) resolves.
      then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }),
    };
    return b;
  }
  return { client: { from }, inserts };
}

function form(extra: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("listingType", "livestock");
  fd.set("listingId", LISTING_ID);
  fd.set("name", "Jane Buyer");
  fd.set("email", "jane@example.com");
  fd.set("phone", "555-0100");
  fd.set("message", "Are these still available?");
  fd.set("company", ""); // honeypot: real form submits the hidden field as ""
  for (const [k, v] of Object.entries(extra)) fd.set(k, v);
  return fd;
}

describe("submitInquiryAction — Redis-missing fail-open", () => {
  const original = { ...process.env };
  beforeEach(() => {
    // Ensure the limiter has no store configured (simulates missing Upstash).
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });
  afterEach(() => {
    process.env = { ...original };
    vi.clearAllMocks();
  });

  it("still creates the lead when the rate-limit store is unavailable", async () => {
    const fake = makeAdmin();
    h.admin = fake.client;

    const res = await submitInquiryAction({}, form());

    expect(res.success).toBe(true);
    expect(res.error).toBeUndefined();
    expect(fake.inserts.leads).toHaveLength(1);
    expect(fake.inserts.listing_inquiries).toHaveLength(1);
  });

  it("returns a clear error and preserves typed values when the lead write fails", async () => {
    const fake = makeAdmin({ leadError: { message: "db down" } });
    h.admin = fake.client;

    const res = await submitInquiryAction({}, form());

    expect(res.success).toBeUndefined();
    expect(res.error).toMatch(/couldn't send your message/i);
    expect(res.values).toMatchObject({
      name: "Jane Buyer",
      email: "jane@example.com",
      phone: "555-0100",
      message: "Are these still available?",
    });
    // No inquiry row should be written if the lead failed.
    expect(fake.inserts.listing_inquiries).toBeUndefined();
  });

  it("preserves typed values on a validation error (does not wipe the form)", async () => {
    h.admin = makeAdmin().client;
    const res = await submitInquiryAction({}, form({ name: "" }));
    expect(res.error).toBeDefined();
    expect(res.values?.email).toBe("jane@example.com");
  });
});
