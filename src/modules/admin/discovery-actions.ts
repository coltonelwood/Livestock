"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { scoreProspect, dedupeKey } from "@/lib/agents/prospect-score";
import { canRunSource, processResults, summarize, placesTextSearch } from "../../../agents/lib/discovery.mjs";
import { fetchAndExtract } from "../../../agents/lib/discover.mjs";

const PATH = "/admin/agents/discovery";
async function adminId() {
  return (await requirePlatformAdmin()).id;
}

/** Approve a source — the admin attests terms allow use + robots checked. */
export async function approveSourceAction(formData: FormData) {
  const uid = await adminId();
  const id = String(formData.get("id") ?? "");
  const approve = String(formData.get("approve") ?? "") === "true";
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("discovery_sources").update({
    approved_by_admin: approve, allowed_by_terms: approve, robots_checked: approve,
    approved_by: approve ? uid : null,
  }).eq("id", id);
  revalidatePath(PATH);
}

export async function setSourceEnabledAction(formData: FormData) {
  await adminId();
  const id = String(formData.get("id") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "true";
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("discovery_sources").update({ enabled }).eq("id", id);
  revalidatePath(PATH);
}

/** Run a governed discovery search. Blocked unless approved+enabled+terms+cap AND
 * an API key is configured. Stages findings as discovery_results (review queue).
 * NEVER contacts anyone. */
export async function runDiscoveryAction(formData: FormData) {
  await adminId();
  const sourceId = String(formData.get("source_id") ?? "");
  const query = String(formData.get("query") ?? "").trim();
  if (!sourceId) return;
  const supabase = await createClient();
  const { data: source } = await supabase.from("discovery_sources").select("*").eq("id", sourceId).maybeSingle();
  if (!source) return;

  const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
  const { count: runsToday } = await supabase.from("discovery_runs").select("id", { count: "exact", head: true }).eq("source_id", sourceId).gte("started_at", startOfDay.toISOString());
  const q = query || (Array.isArray(source.config?.queries) ? String(source.config.queries[0] ?? "") : "");
  const { data: run } = await supabase.from("discovery_runs").insert({ source_id: sourceId, query: q, status: "running" }).select("id").single();
  const runId = run?.id ?? null;
  const fail = async (status: "blocked" | "failed", error: string) => {
    if (runId) await supabase.from("discovery_runs").update({ status, error, finished_at: new Date().toISOString() }).eq("id", runId);
    revalidatePath(PATH);
  };

  const gov = canRunSource(source, runsToday ?? 0);
  if (!gov.allowed) return fail("blocked", gov.reason);
  if (source.source_type !== "google_places") return fail("blocked", "connector_not_implemented");
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return fail("blocked", "missing_api_key");
  if (!q) return fail("blocked", "no_query");

  let normalized: Array<Record<string, unknown>> = [];
  try {
    normalized = await placesTextSearch(apiKey, q, { region: "us" });
  } catch (e) {
    return fail("failed", String(e).slice(0, 200));
  }

  // Dedup against existing prospects + prior discovery results.
  const [{ data: prospects }, { data: priorResults }] = await Promise.all([
    supabase.from("founding_prospects").select("dedupe_key"),
    supabase.from("discovery_results").select("source_id"),
  ]);
  const existingDedupeKeys = new Set((prospects ?? []).map((p) => p.dedupe_key).filter(Boolean) as string[]);
  const existingPlaceIds = new Set((priorResults ?? []).map((r) => r.source_id).filter(Boolean) as string[]);
  const processed = processResults(normalized, { existingPlaceIds, existingDedupeKeys, scoreFn: scoreProspect, allowExtractor: source.enrich_via_extractor });

  const rows = [
    ...processed.staged.map((s) => ({ run_id: runId, source: "google_places", source_id: s.source_id, business_name: s.business_name, website: s.website, phone: s.phone, address: s.address, state: s.state, raw: s.raw ?? {}, confidence: s.confidence, fit_score: s.fit_score, included: true, reason: s.reason })),
    ...processed.duplicates.map((d) => ({ run_id: runId, source: "google_places", source_id: d.source_id, business_name: d.business_name, website: d.website, state: d.state, raw: d.raw ?? {}, included: false, reason: "duplicate" })),
    ...processed.rejected.map((r) => ({ run_id: runId, source: "google_places", included: false, reason: r.reason })),
  ];
  if (rows.length) await supabase.from("discovery_results").insert(rows);
  const sum = summarize(processed);
  if (runId) await supabase.from("discovery_runs").update({ status: "success", finished_at: new Date().toISOString(), total_results: sum.total, duplicates_removed: sum.duplicates_removed, staged: sum.staged, high_fit: sum.high_fit, rejected: sum.rejected }).eq("id", runId);
  await supabase.from("discovery_sources").update({ last_run_at: new Date().toISOString() }).eq("id", sourceId);
  revalidatePath(PATH);
}

/** Promote a reviewed result into the Founding Pipeline (stage 'discovered').
 * If a website + policy allow it, enrich via the robots-aware single-URL
 * extractor first. Never contacts anyone. */
export async function promoteResultAction(formData: FormData) {
  const uid = await adminId();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  const { data: r } = await supabase.from("discovery_results").select("*").eq("id", id).maybeSingle();
  if (!r || !r.business_name || r.prospect_id) return;

  const { data: policy } = await supabase.from("discovery_source_policies").select("allow_extractor").eq("source_type", r.source).maybeSingle();
  let signals: Record<string, unknown> = { state: r.state, weak_website: !r.website };
  if (r.website && policy?.allow_extractor) {
    const ex = await fetchAndExtract(r.website);
    // active_social is derived, not extracted — set it BEFORE scoring so the
    // stored fit_score matches the stored signal columns.
    if (ex.candidate) signals = { ...ex.candidate, active_social: !!ex.candidate.social_url };
  }
  const { score, breakdown } = scoreProspect(signals);
  const dk = dedupeKey(r.business_name, (signals.state as string) ?? r.state);
  const { data: dup } = await supabase.from("founding_prospects").select("id").eq("dedupe_key", dk).maybeSingle();
  if (dup) { await supabase.from("discovery_results").update({ prospect_id: dup.id }).eq("id", id); revalidatePath(PATH); return; }

  const { data: prospect } = await supabase.from("founding_prospects").insert({
    business_name: r.business_name, email: (signals.email as string) ?? null, phone: (signals.phone as string) ?? r.phone ?? null,
    website: r.website ?? null, social_url: (signals.social_url as string) ?? null, state: (signals.state as string) ?? r.state ?? null,
    category: signals.sells_beef ? "beef_seller" : "ranch",
    sells_cattle: !!signals.sells_cattle, sells_beef: !!signals.sells_beef, weak_website: !!signals.weak_website,
    active_social: !!signals.social_url, runs_auctions: !!signals.runs_auctions, good_photos: !!signals.good_photos,
    owner_operated: !!signals.owner_operated,
    fit_score: score, score_breakdown: breakdown, stage: "discovered",
    source: "google_places", source_url: r.website ?? null, dedupe_key: dk, created_by: uid,
  }).select("id").single();
  if (prospect) await supabase.from("discovery_results").update({ prospect_id: prospect.id }).eq("id", id);
  revalidatePath(PATH);
}

export async function rejectResultAction(formData: FormData) {
  await adminId();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("discovery_results").update({ included: false, reason: "rejected_by_admin" }).eq("id", id);
  revalidatePath(PATH);
}
