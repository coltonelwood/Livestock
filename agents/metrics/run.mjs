#!/usr/bin/env node
/**
 * Marketplace intelligence snapshot. Reads REAL inventory counts, computes the
 * liquidity score + regional heatmap + KPIs, and writes a snapshot to
 * analytics_reports, self-scores to agent_performance_metrics, and
 * seller-acquisition priorities (for the emptiest priority regions) to
 * optimization_suggestions. No fabrication — every number is a real count.
 * No-ops without DB. Honors the pause switch.
 */
import { adminClient } from "../lib/supabase.mjs";
import { isAgentPaused } from "../lib/memory.mjs";
import { overallLiquidity, buildLiquidityMap, acquisitionPriorities, computeKpis } from "../lib/metrics-core.mjs";

const parseState = (loc) => {
  const tail = String(loc ?? "").split(",").pop()?.trim().toUpperCase() ?? "";
  return /^[A-Z]{2}$/.test(tail) ? tail : "??";
};
const head = { count: "exact", head: true };

const db = adminClient();
if (!db) { console.log("metrics: no DB env — skipping"); process.exit(0); }
let runId = null;
{
  const { data } = await db.from("agent_runs").insert({ agent: "liquidity", trigger: process.env.AGENT_TRIGGER || "schedule", status: "running" }).select("id").single();
  runId = data?.id ?? null;
}
if (await isAgentPaused(db, "liquidity")) {
  if (runId) await db.from("agent_runs").update({ status: "partial", summary: "paused by admin", finished_at: new Date().toISOString() }).eq("id", runId);
  process.exit(0);
}

async function c(table, build) { const q = build(db.from(table).select("id", head)); const { count } = await q; return count ?? 0; }

const [storefronts, listings, products, auctions, leads, paidOrders, bids, prospects, activeProspects, contactedProspects, outboundSent, inboundReplies] = await Promise.all([
  c("ranch_profiles", (q) => q.eq("is_public", true)),
  c("livestock_listings", (q) => q.eq("status", "active")),
  c("meat_products", (q) => q.eq("status", "active")),
  c("auctions", (q) => q.in("status", ["live", "scheduled"])),
  c("leads", (q) => q),
  c("orders", (q) => q.eq("status", "paid")),
  c("bids", (q) => q),
  c("founding_prospects", (q) => q),
  c("founding_prospects", (q) => q.eq("stage", "active")),
  c("founding_prospects", (q) => q.in("stage", ["contacted", "responded", "onboarding", "active", "inactive"])),
  c("outbound_messages", (q) => q.eq("status", "sent")),
  c("inbound_replies", (q) => q),
]);

const totals = { storefronts, listings, products, auctions };
const { score, breakdown } = overallLiquidity(totals);
const kpis = computeKpis({ activeRanches: storefronts, storefronts, listings, products, auctions, leads, paidOrders, bids, prospects, activeProspects, prospectsContacted: contactedProspects, outboundSent, inboundReplies });

// Regional heatmap from real listing/auction/storefront locations.
const [{ data: liveListings }, { data: liveAuctions }, { data: ranchRows }] = await Promise.all([
  db.from("livestock_listings").select("location").eq("status", "active").limit(1000),
  db.from("auctions").select("location").in("status", ["live", "scheduled"]).limit(500),
  db.from("ranch_profiles").select("location").eq("is_public", true).limit(500),
]);
const regionRows = [];
for (const l of liveListings ?? []) regionRows.push({ region: parseState(l.location), listings: 1 });
for (const a of liveAuctions ?? []) regionRows.push({ region: parseState(a.location), auctions: 1 });
for (const r of ranchRows ?? []) regionRows.push({ region: parseState(r.location), storefronts: 1 });
const map = buildLiquidityMap(regionRows);
const priorities = acquisitionPriorities(map);

const period = new Date().toISOString().slice(0, 10);
const body = [
  `# Liquidity snapshot — ${period}`,
  ``,
  `**Liquidity score: ${score}/100.** ${kpis.activeRanches} storefronts · ${listings} listings · ${products} beef · ${auctions} auctions.`,
  `Gaps to MVP: +${breakdown.storefronts.gap} storefronts, +${breakdown.listings.gap} listings, +${breakdown.products.gap} beef, +${breakdown.auctions.gap} auctions.`,
  ``,
  `## Regional heatmap`,
  ...map.map((r) => `- ${r.region}: density ${r.density} (${r.status}) — ${r.listings}L/${r.products}B/${r.auctions}A`),
  ``,
  `## Seller-acquisition priorities (emptiest priority regions): ${priorities.join(", ") || "none"}`,
].join("\n");
console.log(body);

await db.from("analytics_reports").insert({ period, kind: "liquidity_snapshot", title: `Liquidity ${score}/100 — ${period}`, body, metrics: { score, totals } });
await db.from("agent_performance_metrics").insert([
  { agent: "liquidity", period, metric: "liquidity_score", value: score },
  { agent: "liquidity", period, metric: "active_listings", value: listings },
  { agent: "liquidity", period, metric: "active_beef", value: products },
]);
// Seller-acquisition priorities → proposals (reviewed in Control Center).
for (const region of priorities.slice(0, 6)) {
  await db.from("optimization_suggestions").insert({
    agent: "liquidity", area: "liquidity", title: `Recruit sellers in ${region} (priority gap)`,
    detail: `${region} has little/no inventory and is a focus region. Prioritize freezer-beef sellers + cow-calf producers there.`,
    expected_impact: "regional liquidity density; buyers in-region find inventory", effort: "medium", status: "proposed",
  });
}
if (runId) await db.from("agent_runs").update({ status: "success", finished_at: new Date().toISOString(), summary: `liquidity ${score}/100; priorities: ${priorities.join(",") || "none"}`, stats: { score, ...totals } }).eq("id", runId);
process.exit(0);
