"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/session";
import {
  scoreProspect, dedupeKey, parseProspectsCsv, splitDuplicates, STAGES,
  type Stage,
} from "@/lib/agents/prospect-score";
import { fetchAndExtract } from "../../../agents/lib/discover.mjs";

const PATH = "/admin/agents/prospects";
async function adminId() {
  return (await requirePlatformAdmin()).id;
}
const bool = (fd: FormData, k: string) => !!fd.get(k);
const str = (fd: FormData, k: string) => (String(fd.get(k) ?? "").trim() || null);

function buildRow(fd: FormData, uid: string) {
  const business_name = String(fd.get("business_name") ?? "").trim();
  const state = str(fd, "state");
  const signals = {
    sells_cattle: bool(fd, "sells_cattle"), sells_beef: bool(fd, "sells_beef"),
    weak_website: bool(fd, "weak_website"), active_social: bool(fd, "active_social"),
    uses_messenger: bool(fd, "uses_messenger"), runs_auctions: bool(fd, "runs_auctions"),
    good_photos: bool(fd, "good_photos"), owner_operated: bool(fd, "owner_operated"),
  };
  const { score, breakdown } = scoreProspect({ ...signals, state });
  return {
    business_name, state,
    contact_name: str(fd, "contact_name"), email: str(fd, "email"), phone: str(fd, "phone"),
    website: str(fd, "website"), social_url: str(fd, "social_url"), county: str(fd, "county"),
    category: (str(fd, "category") ?? "ranch") as FoundingCategory,
    what_they_sell: str(fd, "what_they_sell"), notes: str(fd, "notes"),
    source: str(fd, "source") ?? "manual", source_url: str(fd, "source_url"),
    ...signals, fit_score: score, score_breakdown: breakdown,
    dedupe_key: dedupeKey(business_name, state), created_by: uid,
  };
}
type FoundingCategory = "ranch" | "breeder" | "beef_seller" | "auction_house" | "other";

/** Manual single-prospect entry (no fabrication — human-supplied fields only). */
export async function addProspectAction(formData: FormData) {
  const uid = await adminId();
  const business_name = String(formData.get("business_name") ?? "").trim();
  if (!business_name) return;
  const supabase = await createClient();
  const row = buildRow(formData, uid);
  // Soft dedup: skip if an identical key already exists.
  const { data: dup } = await supabase.from("founding_prospects").select("id").eq("dedupe_key", row.dedupe_key).maybeSingle();
  if (dup) { revalidatePath(PATH); return; }
  const { data } = await supabase.from("founding_prospects").insert(row).select("id").single();
  if (data) await supabase.from("prospect_events").insert({ prospect_id: data.id, event_type: "created", detail: `manual entry, score ${row.fit_score}`, created_by: uid });
  revalidatePath(PATH);
}

/** Bulk CSV import: parse → score → dedup against existing → insert fresh only. */
export async function importCsvAction(formData: FormData) {
  const uid = await adminId();
  const text = String(formData.get("csv") ?? "");
  if (!text.trim()) return;
  const parsed = parseProspectsCsv(text);
  if (!parsed.length) { revalidatePath(PATH); return; }
  const supabase = await createClient();
  const { data: existing } = await supabase.from("founding_prospects").select("dedupe_key");
  const keys = new Set((existing ?? []).map((e) => e.dedupe_key).filter(Boolean) as string[]);
  const { fresh } = splitDuplicates(parsed, keys);
  if (!fresh.length) { revalidatePath(PATH); return; }
  const rows = fresh.map((p) => {
    const { score, breakdown } = scoreProspect(p);
    return {
      business_name: p.business_name, contact_name: p.contact_name ?? null, email: p.email ?? null,
      phone: p.phone ?? null, website: p.website ?? null, social_url: p.social_url ?? null,
      state: p.state ?? null, county: p.county ?? null,
      category: (p.category ?? "ranch") as FoundingCategory, what_they_sell: p.what_they_sell ?? null,
      sells_cattle: p.sells_cattle, sells_beef: p.sells_beef, weak_website: p.weak_website,
      active_social: p.active_social, uses_messenger: p.uses_messenger, runs_auctions: p.runs_auctions,
      good_photos: p.good_photos, owner_operated: p.owner_operated,
      fit_score: score, score_breakdown: breakdown, source: p.source ?? "csv", source_url: p.source_url ?? null,
      notes: p.notes ?? null, dedupe_key: dedupeKey(p.business_name, p.state), created_by: uid,
    };
  });
  await supabase.from("founding_prospects").insert(rows);
  revalidatePath(PATH);
}

/**
 * Compliant assisted discovery: fetch ONE operator-chosen public URL (only if
 * robots.txt allows), extract real on-page contact + signals, score, dedup, and
 * stage as 'discovered' for review. No crawling, no link-following, no
 * fabrication, no sending. Blocked/empty results are skipped silently.
 */
export async function discoverProspectAction(formData: FormData) {
  const uid = await adminId();
  const url = String(formData.get("url") ?? "").trim();
  if (!url) return;
  const result = await fetchAndExtract(url);
  if (!result.candidate || !result.candidate.business_name) { revalidatePath(PATH); return; }
  const c = result.candidate;
  const { score, breakdown } = scoreProspect(c);
  const dk = dedupeKey(c.business_name, c.state);
  const supabase = await createClient();
  const { data: dup } = await supabase.from("founding_prospects").select("id").eq("dedupe_key", dk).maybeSingle();
  if (dup) { revalidatePath(PATH); return; }
  const { data } = await supabase.from("founding_prospects").insert({
    business_name: c.business_name, email: c.email ?? null, phone: c.phone ?? null,
    website: c.website ?? null, social_url: c.social_url ?? null, state: c.state ?? null,
    category: c.sells_beef ? "beef_seller" : "ranch",
    sells_cattle: c.sells_cattle, sells_beef: c.sells_beef, weak_website: c.weak_website,
    active_social: !!c.social_url, uses_messenger: false, runs_auctions: c.runs_auctions,
    good_photos: c.good_photos, owner_operated: c.owner_operated,
    fit_score: score, score_breakdown: breakdown, stage: "discovered",
    source: "public_website", source_url: url, dedupe_key: dk, created_by: uid,
  }).select("id").single();
  if (data) await supabase.from("prospect_events").insert({ prospect_id: data.id, event_type: "created", detail: `discovered from ${url} (score ${score})`, created_by: uid });
  revalidatePath(PATH);
}

export async function setProspectStageAction(formData: FormData) {
  const uid = await adminId();
  const id = String(formData.get("id") ?? "");
  const stage = String(formData.get("stage") ?? "") as Stage;
  if (!id || !STAGES.includes(stage)) return;
  const supabase = await createClient();
  const patch: { stage: Stage; last_contacted_at?: string } = { stage };
  if (stage === "contacted") patch.last_contacted_at = new Date().toISOString();
  await supabase.from("founding_prospects").update(patch).eq("id", id);
  await supabase.from("prospect_events").insert({ prospect_id: id, event_type: "stage_change", detail: stage, created_by: uid });
  revalidatePath(PATH);
}

export async function deleteProspectAction(formData: FormData) {
  await adminId();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("founding_prospects").delete().eq("id", id);
  revalidatePath(PATH);
}

export async function addReferrerAction(formData: FormData) {
  const uid = await adminId();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const supabase = await createClient();
  await supabase.from("prospect_referrers").insert({
    name, type: (str(formData, "type") ?? "rancher") as never,
    contact: str(formData, "contact"), reward_note: str(formData, "reward_note"), created_by: uid,
  });
  revalidatePath(PATH);
}

const ANGLES: Record<string, (p: ProspectLike) => string> = {
  storefront: (p) => `Howdy ${p.first}, came across ${p.name} and I'm building a livestock marketplace + ranch storefront. Looking for a handful of founding ranches to help shape it — I'd set yours up myself, free, and mainly want honest feedback from a real operator. Worth a look?`,
  leads: (p) => `${p.first}, looks like buyers reach out to ${p.name} by message/comment. I'm building a tool that captures those inquiries in one place so none slip through. Could I set you up as a founding ranch (free) and get your take?`,
  beef: (p) => `Hey ${p.first} — I'm building a spot where ranchers sell beef direct with a real storefront (not just a Facebook post). Want me to build ${p.name}'s free as a founding seller? Just after feedback.`,
  auction: (p) => `${p.first}, if you run a sale for ${p.name} I'm building clean mobile auction pages with bidder lead capture. Looking for a founding sale operator to test it — interested?`,
  founding: (p) => `Hi ${p.first}, I'm building OpenRange — a livestock marketplace, ranch storefront, and direct-beef platform — and hand-picking ~20 founding ranches. ${p.name} fits. Free hands-on setup; I want blunt feedback from real operators. Open to a quick chat?`,
};
type ProspectLike = { first: string; name: string };

/** Draft personalized outreach for a prospect → outreach_drafts (PENDING approval).
 * Never sends. The Control Center approvals queue is where you review it. */
export async function draftOutreachForProspectAction(formData: FormData) {
  await adminId();
  const id = String(formData.get("id") ?? "");
  const angle = String(formData.get("angle") ?? "founding");
  const channel = (String(formData.get("channel") ?? "social_dm")) as "email" | "sms" | "social_dm" | "mail";
  if (!id || !ANGLES[angle]) return;
  const supabase = await createClient();
  const { data: p } = await supabase.from("founding_prospects").select("business_name, contact_name").eq("id", id).maybeSingle();
  if (!p) return;
  const first = (p.contact_name ?? "").trim().split(/\s+/)[0] || "there";
  const body = ANGLES[angle]({ first, name: p.business_name });
  await supabase.from("outreach_drafts").insert({
    prospect_id: id, channel, body, status: "pending_approval",
    subject: channel === "email" ? `Founding ranch on a new livestock marketplace` : null,
  });
  revalidatePath(PATH);
}
