import { describe, expect, it } from "vitest";

import { buildEmail, type NotificationType } from "@/lib/notifications/templates";
import { sendEmail } from "@/lib/notifications/provider";

const ALL: NotificationType[] = [
  "inquiry_confirmation",
  "inquiry_alert",
  "order_confirmation",
  "order_alert",
  "order_fulfilled",
  "outbid",
  "auction_won",
  "payment_failed",
  "lead_alert",
];

describe("buildEmail", () => {
  it("produces a non-empty subject + body for every type", () => {
    for (const t of ALL) {
      const r = buildEmail(t, { business: "Cross Creek", total: 300, amount: 1100, lotTitle: "Lot 1", itemTitle: "Half beef", leadName: "Dale", contact: "555-0142" });
      expect(r.subject.length).toBeGreaterThan(0);
      expect(r.text.length).toBeGreaterThan(0);
      expect(r.html).toContain("<p>");
    }
  });

  it("includes the key data in the relevant template", () => {
    expect(buildEmail("order_confirmation", { total: 300 }).text).toContain("$300");
    expect(buildEmail("outbid", { lotTitle: "Angus heifers", amount: 1100 }).subject).toContain("Angus heifers");
    expect(buildEmail("inquiry_alert", { leadName: "Dale", contact: "x@y.com" }).text).toContain("Dale");
    expect(buildEmail("auction_won", { amount: 2300 }).text).toContain("$2,300");
  });
});

describe("provider fallback", () => {
  it("returns skipped when no email provider is configured", async () => {
    const saved = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    const result = await sendEmail("a@b.com", "Hi", "<p>Hi</p>", "Hi");
    expect(result).toEqual({ ok: false, skipped: true });
    if (saved) process.env.RESEND_API_KEY = saved;
  });
});
