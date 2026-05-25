import { describe, expect, it } from "vitest";

import { minimumBid, bidErrorMessage, createLotSchema, isAuctionDue } from "@/modules/auctions/schema";

describe("isAuctionDue", () => {
  const now = Date.UTC(2026, 0, 1, 12, 0, 0);
  it("is due when the end time has passed", () => {
    expect(isAuctionDue(new Date(now - 1000).toISOString(), now)).toBe(true);
  });
  it("is not due before the end time", () => {
    expect(isAuctionDue(new Date(now + 1000).toISOString(), now)).toBe(false);
  });
  it("is never due without an end time", () => {
    expect(isAuctionDue(null, now)).toBe(false);
  });
});

describe("minimumBid", () => {
  it("uses the opening bid when there are no bids yet", () => {
    expect(minimumBid(null, 1000, 100)).toBe(1000);
  });
  it("adds the increment to the current high bid", () => {
    expect(minimumBid(1000, 1000, 100)).toBe(1100);
    expect(minimumBid(1100, 1000, 250)).toBe(1350);
  });
});

describe("bidErrorMessage", () => {
  it("explains a too-low bid with the minimum", () => {
    expect(bidErrorMessage("BID_TOO_LOW:1100")).toContain("1,100");
  });
  it("maps known error codes to friendly copy", () => {
    expect(bidErrorMessage("SELF_BID_FORBIDDEN")).toMatch(/own lot/i);
    expect(bidErrorMessage("AUCTION_NOT_LIVE")).toMatch(/bids/i);
    expect(bidErrorMessage("AUTH_REQUIRED")).toMatch(/log in/i);
  });
  it("falls back gracefully on unknown errors", () => {
    expect(bidErrorMessage("some random pg error")).toMatch(/could not place/i);
  });
});

describe("createLotSchema", () => {
  it("defaults increment to 25 and head count to 1", () => {
    const r = createLotSchema.safeParse({ title: "Angus heifers" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.bid_increment_usd).toBe(25);
      expect(r.data.head_count).toBe(1);
    }
  });
  it("rejects a non-positive increment", () => {
    const r = createLotSchema.safeParse({ title: "x", bid_increment_usd: "0" });
    expect(r.success).toBe(false);
  });
});
