import { describe, expect, it } from "vitest";

import {
  looksLikeSecret,
  redactSecrets,
  isExpired,
  isRetrievable,
  scopeVisible,
  rankMemories,
  selectForContext,
  buildPromptContext,
} from "../../../agents/lib/memory-core.mjs";

const now = Date.UTC(2026, 4, 26);
const mem = (over = {}) => ({
  id: "m", agent: "growth", memory_type: "successful_tactic", summary: "x",
  confidence_score: 0.6, scope: "global", status: "active",
  organization_id: null, user_id: null, pinned: false,
  created_at: new Date(now - 86400000).toISOString(), expires_at: null, ...over,
});

describe("memory scoping (no cross-org leakage)", () => {
  it("global is visible to anyone", () => {
    expect(scopeVisible(mem({ scope: "global" }), { agent: "ops" })).toBe(true);
  });
  it("agent-scoped only to that agent", () => {
    expect(scopeVisible(mem({ scope: "agent", agent: "growth" }), { agent: "growth" })).toBe(true);
    expect(scopeVisible(mem({ scope: "agent", agent: "growth" }), { agent: "ops" })).toBe(false);
  });
  it("org-scoped never leaks to another org", () => {
    const m = mem({ scope: "org", organization_id: "org-A" });
    expect(scopeVisible(m, { agent: "growth", organizationId: "org-A" })).toBe(true);
    expect(scopeVisible(m, { agent: "growth", organizationId: "org-B" })).toBe(false);
    expect(scopeVisible(m, { agent: "growth" })).toBe(false); // no org context
  });
  it("user-scoped only to that user", () => {
    const m = mem({ scope: "user", user_id: "u1" });
    expect(scopeVisible(m, { userId: "u1" })).toBe(true);
    expect(scopeVisible(m, { userId: "u2" })).toBe(false);
  });
});

describe("memory retention", () => {
  it("rejected memory is never reused", () => {
    expect(isRetrievable(mem({ status: "rejected" }), now)).toBe(false);
    expect(isRetrievable(mem({ status: "pending" }), now)).toBe(false);
    expect(isRetrievable(mem({ status: "archived" }), now)).toBe(false);
    expect(isRetrievable(mem({ status: "active" }), now)).toBe(true);
  });
  it("expired memory is not retrieved", () => {
    expect(isExpired(mem({ expires_at: new Date(now - 1000).toISOString() }), now)).toBe(true);
    expect(isExpired(mem({ expires_at: new Date(now + 1000).toISOString() }), now)).toBe(false);
    expect(isExpired(mem({ expires_at: null }), now)).toBe(false);
    expect(isRetrievable(mem({ expires_at: new Date(now - 1000).toISOString() }), now)).toBe(false);
  });
  it("low-confidence memory drops below the floor", () => {
    expect(isRetrievable(mem({ confidence_score: 0.1 }), now, 0.25)).toBe(false);
    expect(isRetrievable(mem({ confidence_score: 0.5 }), now, 0.25)).toBe(true);
  });
});

describe("secret guard (no credentials in memory)", () => {
  it("detects common secret shapes", () => {
    expect(looksLikeSecret("sk-ant-api03-abcdefghijklmnop12345")).toBe(true);
    expect(looksLikeSecret("token sbp_0123456789abcdef0123456789abcdef")).toBe(true);
    expect(looksLikeSecret("password=hunter2xyz")).toBe(true);
    expect(looksLikeSecret("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c")).toBe(true);
    expect(looksLikeSecret("The Angus heifers sold well in Kansas.")).toBe(false);
  });
  it("redacts secrets", () => {
    expect(redactSecrets("key=sk-ant-api03-abcdefghijklmnop12345 here")).toContain("[redacted]");
  });
});

describe("ranking + selection", () => {
  it("pinned + confidence + feedback affect order", () => {
    const a = mem({ id: "a", confidence_score: 0.5 });
    const b = mem({ id: "b", confidence_score: 0.5, pinned: true });
    expect(rankMemories([a, b], now)[0].id).toBe("b"); // pinned wins
    const c = mem({ id: "c", confidence_score: 0.5, feedback: { useful: 5, not_useful: 0 } });
    const d = mem({ id: "d", confidence_score: 0.5, feedback: { useful: 0, not_useful: 5 } });
    expect(rankMemories([d, c], now)[0].id).toBe("c"); // positive feedback ranks higher
  });

  it("selectForContext filters retention+scope, ranks, and splits tactics", () => {
    const rows = [
      mem({ id: "g", memory_type: "brand_rule", scope: "global", pinned: true, confidence_score: 1 }),
      mem({ id: "ok", memory_type: "successful_tactic" }),
      mem({ id: "bad", memory_type: "failed_tactic" }),
      mem({ id: "rej", status: "rejected" }),
      mem({ id: "exp", expires_at: new Date(now - 1000).toISOString() }),
      mem({ id: "other-org", scope: "org", organization_id: "org-Z" }),
    ];
    const sel = selectForContext(rows, { agent: "growth", organizationId: "org-A" }, { now });
    const ids = sel.memories.map((m) => m.id);
    expect(ids).toContain("g");
    expect(ids).toContain("ok");
    expect(ids).not.toContain("rej");
    expect(ids).not.toContain("exp");
    expect(ids).not.toContain("other-org");
    expect(sel.brandRules.map((m) => m.id)).toEqual(["g"]);
    expect(sel.failedTactics.map((m) => m.id)).toEqual(["bad"]);
    expect(sel.successfulTactics.map((m) => m.id)).toEqual(["ok"]);
  });

  it("buildPromptContext surfaces brand rules, reuse, and avoid blocks", () => {
    const sel = selectForContext(
      [
        mem({ id: "g", memory_type: "brand_rule", summary: "Western voice" }),
        mem({ id: "ok", memory_type: "successful_tactic", summary: "short emails reply better" }),
        mem({ id: "bad", memory_type: "failed_tactic", summary: "long pitches get ignored" }),
      ],
      { agent: "growth" }, { now },
    );
    const txt = buildPromptContext(sel, { playbook: { title: "Seller acq", slug: "seller-acquisition", steps: "do x" } });
    expect(txt).toContain("BRAND RULES");
    expect(txt).toContain("Western voice");
    expect(txt).toContain("REUSE");
    expect(txt).toContain("AVOID");
    expect(txt).toContain("Seller acq");
  });
});
