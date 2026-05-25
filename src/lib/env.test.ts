import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Env decoupling regression: the Supabase service-role client (lead capture,
 * photo upload, webhooks) must validate INDEPENDENTLY of the AI key, so a
 * missing ANTHROPIC_API_KEY can't take down DB/storage admin operations.
 */
describe("server env decoupling", () => {
  const original = { ...process.env };
  beforeEach(() => { vi.resetModules(); });
  afterEach(() => { process.env = { ...original }; });

  it("supabaseAdminEnv() succeeds when ANTHROPIC_API_KEY is absent", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "svc_role_key";
    delete process.env.ANTHROPIC_API_KEY;
    const { supabaseAdminEnv } = await import("@/lib/env");
    expect(supabaseAdminEnv().SUPABASE_SERVICE_ROLE_KEY).toBe("svc_role_key");
  });

  it("aiEnv() throws when ANTHROPIC_API_KEY is missing", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "svc_role_key";
    delete process.env.ANTHROPIC_API_KEY;
    const { aiEnv } = await import("@/lib/env");
    expect(() => aiEnv()).toThrow();
  });

  it("supabaseAdminEnv() throws when the service-role key is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { supabaseAdminEnv } = await import("@/lib/env");
    expect(() => supabaseAdminEnv()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});
