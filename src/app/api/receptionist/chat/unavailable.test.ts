import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { enforce } from "@/lib/ratelimit";

/**
 * BUG-2 regression: when the rate-limit store is unavailable, anonymous AI chat
 * must FAIL CLOSED (protecting model spend) but report a CLEAR "unavailable"
 * state (HTTP 503 + flag) — never a generic crash. Authenticated chat must keep
 * failing OPEN.
 */

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
  }),
}));

import { POST } from "@/app/api/receptionist/chat/route";

type RouteRequest = Parameters<typeof POST>[0];

function makeRequest(body: unknown): RouteRequest {
  return new Request("http://localhost/api/receptionist/chat", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
  }) as unknown as RouteRequest;
}

describe("receptionist chat — store unavailable", () => {
  const original = { ...process.env };
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });
  afterEach(() => {
    process.env = { ...original };
    vi.clearAllMocks();
  });

  it("returns 503 with a clear unavailable state for anonymous visitors", async () => {
    const res = await POST(
      makeRequest({
        organizationId: "22222222-2222-2222-2222-222222222222",
        message: "Do you sell half beef?",
      }),
    );
    expect(res.status).toBe(503);
    const json = (await res.json()) as { unavailable?: boolean; reply?: string };
    expect(json.unavailable).toBe(true);
    expect(json.reply).toMatch(/temporarily unavailable/i);
  });

  it("authenticated chat still fails OPEN when the store is unavailable", async () => {
    const gate = await enforce(
      [{ name: "authedChat", identifier: "user:org" }],
      { failOpen: true },
      null,
    );
    expect(gate.allowed).toBe(true);
    expect(gate.unavailable).toBe(true);
  });

  it("anonymous chat policy fails CLOSED when the store is unavailable", async () => {
    const gate = await enforce(
      [
        { name: "publicChat", identifier: "1.2.3.4" },
        { name: "orgChat", identifier: "org-1" },
      ],
      { failOpen: false },
      null,
    );
    expect(gate.allowed).toBe(false);
    expect(gate.unavailable).toBe(true);
  });
});
