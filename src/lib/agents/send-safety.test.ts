import { describe, expect, it } from "vitest";

import {
  spamRiskScore, isPersonalized, canSend, normalizeContact, isSuppressed,
} from "../../../agents/lib/send-safety.mjs";
import { classifyReply, replyAction } from "../../../agents/lib/reply-classify.mjs";

const prospect = { business_name: "Cross Creek Cattle Co", contact_name: "Jane Doe" };
const goodBody = "Howdy Jane, came across Cross Creek and I'm building a livestock marketplace. Looking for a few founding ranches — I'd set yours up free and just want honest feedback. Worth a look?";

describe("personalization + spam-risk", () => {
  it("detects personalization by contact or business name", () => {
    expect(isPersonalized(goodBody, prospect)).toBe(true);
    expect(isPersonalized("Dear valued rancher, big opportunity!", prospect)).toBe(false);
    expect(isPersonalized("Hi {{first_name}} at {{ranch_name}}", prospect)).toBe(false); // unfilled
  });
  it("scores a clean personalized message low", () => {
    expect(spamRiskScore(goodBody, prospect).score).toBeLessThan(40);
  });
  it("flags prohibited phrases, fake traction, and shouting", () => {
    expect(spamRiskScore("ACT NOW! GUARANTEED results, join 10000 ranchers!!!!", prospect).score).toBeGreaterThanOrEqual(40);
    expect(spamRiskScore("Trusted by 5000 ranches — buy now, limited time!", prospect).reasons).toContain("fake_traction");
  });
});

describe("canSend gate", () => {
  const base = {
    body: goodBody, toContact: "jane@crosscreek.example", prospect,
    suppressionSet: new Set<string>(), recentBodies: new Set<string>(),
    lastContactedAt: null as string | null, cooldownDays: 14, sentToday: 0, dailyCap: 10, armed: true,
  };
  it("allows a clean, personalized message when armed and within limits", () => {
    expect(canSend(base)).toMatchObject({ allowed: true, hold: false });
  });
  it("holds (never blind-sends) when NOT armed", () => {
    expect(canSend({ ...base, armed: false })).toMatchObject({ allowed: false, hold: true, reasons: ["not_armed"] });
  });
  it("NEVER sends to a suppressed contact", () => {
    const s = canSend({ ...base, suppressionSet: new Set(["jane@crosscreek.example"]) });
    expect(s).toMatchObject({ allowed: false, hold: false });
    expect(s.reasons).toContain("suppressed");
  });
  it("holds on cooldown, daily cap, duplicate, and spam risk", () => {
    expect(canSend({ ...base, lastContactedAt: new Date().toISOString() }).reasons).toContain("cooldown");
    expect(canSend({ ...base, sentToday: 10 }).reasons).toContain("daily_cap_reached");
    expect(canSend({ ...base, recentBodies: new Set([goodBody]) }).reasons).toContain("duplicate_send");
    expect(canSend({ ...base, body: "BUY NOW guaranteed!!!!" }).allowed).toBe(false);
  });
  it("holds an unpersonalized message even when armed", () => {
    expect(canSend({ ...base, body: "Dear rancher, check out our platform." }).allowed).toBe(false);
  });
  it("normalizes + matches suppression case-insensitively", () => {
    expect(normalizeContact("  Jane@Crosscreek.Example ")).toBe("jane@crosscreek.example");
    expect(isSuppressed(new Set(["jane@crosscreek.example"]), "JANE@crosscreek.example")).toBe(true);
  });
});

describe("reply classification", () => {
  it("classifies the workflow categories", () => {
    expect(classifyReply("Not interested, take me off your list").category).toBe("not_interested");
    expect(classifyReply("Sounds good, tell me more!").category).toBe("interested");
    expect(classifyReply("How much does it cost?").category).toBe("pricing");
    expect(classifyReply("Can we hop on a call / demo?").category).toBe("wants_demo");
    expect(classifyReply("We already have a website we're happy with").category).toBe("has_solution");
    expect(classifyReply("Check back after calving season").category).toBe("follow_up_later");
    expect(classifyReply("undeliverable: mailbox full").category).toBe("spam_bounce");
  });
  it("suppresses + inactivates on a clear no", () => {
    expect(replyAction("not_interested")).toMatchObject({ suppress: true, stage: "inactive" });
    expect(replyAction("interested")).toMatchObject({ suppress: false, stage: "responded" });
    expect(replyAction("spam_bounce").suppress).toBe(true);
  });
});
