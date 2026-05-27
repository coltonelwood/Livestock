// Marketplace intelligence: KPI + liquidity computation. Pure (no I/O),
// unit-tested. Numbers come ONLY from real DB counts passed in — never invented.

export const MVP_TARGETS = { storefronts: 20, listings: 100, products: 50, auctions: 5 };
export const PRIORITY_REGIONS = ["CO", "WY", "UT", "OK"]; // focus regions (zero inventory today)

/** Overall liquidity score 0–100 = weighted % of the MVP supply targets met. */
export function overallLiquidity(totals, targets = MVP_TARGETS) {
  const part = (have, target, weight) => Math.min(1, target ? (have ?? 0) / target : 0) * weight;
  const score = Math.round(
    part(totals.storefronts, targets.storefronts, 30) +
    part(totals.listings, targets.listings, 35) +
    part(totals.products, targets.products, 25) +
    part(totals.auctions, targets.auctions, 10),
  );
  const breakdown = {
    storefronts: { have: totals.storefronts ?? 0, target: targets.storefronts, gap: Math.max(0, targets.storefronts - (totals.storefronts ?? 0)) },
    listings: { have: totals.listings ?? 0, target: targets.listings, gap: Math.max(0, targets.listings - (totals.listings ?? 0)) },
    products: { have: totals.products ?? 0, target: targets.products, gap: Math.max(0, targets.products - (totals.products ?? 0)) },
    auctions: { have: totals.auctions ?? 0, target: targets.auctions, gap: Math.max(0, targets.auctions - (totals.auctions ?? 0)) },
  };
  return { score, breakdown };
}

export function regionDensity(row) {
  return (row.listings ?? 0) + (row.products ?? 0) + (row.auctions ?? 0);
}

/** Region health label. Priority regions with no inventory are the loudest gaps. */
export function regionStatus(row) {
  const d = regionDensity(row);
  const priority = PRIORITY_REGIONS.includes((row.region ?? "").toUpperCase());
  if (d === 0) return priority ? "priority-gap" : "empty";
  if (d < 5) return "thin";
  if (d < 15) return "building";
  return "healthy";
}

/**
 * Build a liquidity heatmap. Ensures every priority region appears (even at 0,
 * so gaps are visible), then sorts: priority-gaps first, then by density desc.
 */
export function buildLiquidityMap(regionRows) {
  const byRegion = new Map();
  for (const r of regionRows) {
    const k = (r.region ?? "??").toUpperCase();
    const cur = byRegion.get(k) ?? { region: k, listings: 0, products: 0, auctions: 0, storefronts: 0 };
    cur.listings += r.listings ?? 0; cur.products += r.products ?? 0;
    cur.auctions += r.auctions ?? 0; cur.storefronts += r.storefronts ?? 0;
    byRegion.set(k, cur);
  }
  for (const p of PRIORITY_REGIONS) if (!byRegion.has(p)) byRegion.set(p, { region: p, listings: 0, products: 0, auctions: 0, storefronts: 0 });
  const rows = [...byRegion.values()].map((r) => ({ ...r, density: regionDensity(r), status: regionStatus(r), priority: PRIORITY_REGIONS.includes(r.region) }));
  const rank = { "priority-gap": 0, empty: 1, thin: 2, building: 3, healthy: 4 };
  return rows.sort((a, b) => (rank[a.status] - rank[b.status]) || (b.density - a.density));
}

/** Acquisition priorities: which priority regions are emptiest (for seller targeting). */
export function acquisitionPriorities(map) {
  return map.filter((r) => r.status === "priority-gap" || (r.priority && r.density < 5)).map((r) => r.region);
}

/** Shape the headline KPIs from raw counts. Derived rates only when a denominator exists. */
export function computeKpis(raw = {}) {
  const sent = raw.outboundSent ?? 0;
  const replies = raw.inboundReplies ?? 0;
  const contacted = raw.prospectsContacted ?? 0;
  const active = raw.activeProspects ?? 0;
  return {
    activeRanches: raw.activeRanches ?? 0,
    storefronts: raw.storefronts ?? 0,
    listings: raw.listings ?? 0,
    products: raw.products ?? 0,
    auctions: raw.auctions ?? 0,
    leads: raw.leads ?? 0,
    paidOrders: raw.paidOrders ?? 0,
    bids: raw.bids ?? 0,
    prospects: raw.prospects ?? 0,
    outboundSent: sent,
    inboundReplies: replies,
    replyRate: sent ? Math.round((replies / sent) * 100) : null,
    activationRate: contacted ? Math.round((active / contacted) * 100) : null,
  };
}
