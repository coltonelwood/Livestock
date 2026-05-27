import { describe, expect, it } from "vitest";

import {
  overallLiquidity, buildLiquidityMap, regionStatus, acquisitionPriorities,
  computeKpis, MVP_TARGETS, PRIORITY_REGIONS,
} from "../../../agents/lib/metrics-core.mjs";

describe("overall liquidity", () => {
  it("scores 0 when empty and 100 when targets met", () => {
    expect(overallLiquidity({ storefronts: 0, listings: 0, products: 0, auctions: 0 }).score).toBe(0);
    expect(overallLiquidity(MVP_TARGETS).score).toBe(100);
  });
  it("reports real gaps to target (current seeded inventory)", () => {
    const { score, breakdown } = overallLiquidity({ storefronts: 5, listings: 11, products: 6, auctions: 3 });
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(40);
    expect(breakdown.listings.gap).toBe(89);
    expect(breakdown.products.gap).toBe(44);
  });
});

describe("liquidity heatmap", () => {
  it("surfaces priority regions even at zero, ranked as gaps first", () => {
    const map = buildLiquidityMap([
      { region: "KS", listings: 8, products: 4, auctions: 1, storefronts: 1 },
      { region: "tx", listings: 3, products: 0, auctions: 1, storefronts: 1 },
    ]);
    const regions = map.map((r) => r.region);
    for (const p of PRIORITY_REGIONS) expect(regions).toContain(p); // CO/WY/UT/OK present even with no data
    expect(map[0].status).toBe("priority-gap"); // a zero priority region ranks first
    const ks = map.find((r) => r.region === "KS");
    expect(ks?.status).toBe("building"); // density 13
  });
  it("classifies status by density", () => {
    expect(regionStatus({ region: "CO", listings: 0, products: 0, auctions: 0 })).toBe("priority-gap");
    expect(regionStatus({ region: "ID", listings: 0, products: 0, auctions: 0 })).toBe("empty");
    expect(regionStatus({ region: "KS", listings: 2, products: 0, auctions: 0 })).toBe("thin");
    expect(regionStatus({ region: "KS", listings: 20, products: 5, auctions: 1 })).toBe("healthy");
  });
  it("derives acquisition priorities from the emptiest priority regions", () => {
    const map = buildLiquidityMap([{ region: "CO", listings: 1, products: 0, auctions: 0, storefronts: 0 }]);
    const pri = acquisitionPriorities(map);
    expect(pri).toContain("WY"); // zero priority region
    expect(pri).toContain("CO"); // priority + thin
  });
});

describe("kpis", () => {
  it("derives rates only when a denominator exists", () => {
    expect(computeKpis({ outboundSent: 0 }).replyRate).toBeNull();
    expect(computeKpis({ outboundSent: 10, inboundReplies: 3 }).replyRate).toBe(30);
    expect(computeKpis({ prospectsContacted: 8, activeProspects: 2 }).activationRate).toBe(25);
    expect(computeKpis({ listings: 11, products: 6 })).toMatchObject({ listings: 11, products: 6, bids: 0 });
  });
});
