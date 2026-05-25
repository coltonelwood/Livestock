import { describe, expect, it } from "vitest";

import { siteConfig } from "@/modules/marketing/site-config";
import {
  demoCattleListings,
  demoBeefBoxes,
  demoAuctionLots,
  formatUsd,
} from "@/modules/marketing/demo-data";

describe("public navigation", () => {
  it("exposes the core product pages without requiring an account", () => {
    const hrefs = siteConfig.nav.map((n) => n.href);
    for (const required of [
      "/listings",
      "/beef",
      "/auctions",
      "/receptionist",
      "/crm",
      "/pricing",
      "/about",
    ]) {
      expect(hrefs).toContain(required);
    }
  });
});

describe("demo content", () => {
  it("provides example listings, beef, and auction lots for empty public pages", () => {
    expect(demoCattleListings.length).toBeGreaterThan(0);
    expect(demoBeefBoxes.length).toBeGreaterThan(0);
    expect(demoAuctionLots.length).toBeGreaterThan(0);
  });

  it("has well-formed demo listings", () => {
    for (const l of demoCattleListings) {
      expect(l.id).toMatch(/^demo/);
      expect(l.title.length).toBeGreaterThan(0);
      expect(l.headCount).toBeGreaterThan(0);
    }
  });

  it("formats prices and handles missing price", () => {
    expect(formatUsd(2850)).toBe("$2,850");
    expect(formatUsd(null)).toBe("Contact for price");
  });
});
