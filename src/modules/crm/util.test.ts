import { describe, expect, it } from "vitest";

import { sourceLabel, bucketReminder } from "@/modules/crm/util";

describe("sourceLabel", () => {
  it("labels each lead source", () => {
    expect(sourceLabel("web_chat")).toBe("AI receptionist");
    expect(sourceLabel("listing_inquiry")).toBe("Listing inquiry");
    expect(sourceLabel("auction")).toBe("Auction");
    expect(sourceLabel("order")).toBe("DTC order");
    expect(sourceLabel("manual")).toBe("Manual");
  });
});

describe("bucketReminder", () => {
  const now = new Date("2026-05-25T12:00:00").getTime();

  it("buckets done/cancelled regardless of date", () => {
    expect(bucketReminder("2020-01-01T00:00:00", "done", now)).toBe("done");
    expect(bucketReminder("2020-01-01T00:00:00", "cancelled", now)).toBe("done");
  });

  it("flags past-day pending reminders as overdue", () => {
    expect(bucketReminder("2026-05-24T09:00:00", "pending", now)).toBe("overdue");
  });

  it("treats same-day reminders as today (even earlier in the day)", () => {
    expect(bucketReminder("2026-05-25T08:00:00", "pending", now)).toBe("today");
    expect(bucketReminder("2026-05-25T20:00:00", "pending", now)).toBe("today");
  });

  it("treats future days as upcoming", () => {
    expect(bucketReminder("2026-05-26T08:00:00", "pending", now)).toBe("upcoming");
  });
});
