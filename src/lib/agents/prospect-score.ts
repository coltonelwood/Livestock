/**
 * Founding-ranch prospect intelligence: scoring, dedup, and CSV ingestion.
 * Pure functions (no I/O), unit-tested. No fabrication — these only organize and
 * rank data a human supplied from an approved source.
 */

export const STAGES = [
  "discovered", "reviewed", "approved", "contacted",
  "responded", "onboarding", "active", "inactive",
] as const;
export type Stage = (typeof STAGES)[number];

/** Target geography. Top priority = your stated focus with zero inventory today. */
export const TOP_REGIONS = ["CO", "UT", "WY", "OK"];
export const SECONDARY_REGIONS = ["MT", "TX", "KS", "NE"];

export type ProspectSignals = {
  sells_cattle?: boolean;
  sells_beef?: boolean;
  weak_website?: boolean;
  active_social?: boolean;
  uses_messenger?: boolean;
  runs_auctions?: boolean;
  good_photos?: boolean;
  owner_operated?: boolean;
  state?: string | null;
};

/**
 * Fit score 1–10 with a transparent breakdown. Weights favor real liquidity
 * value (cattle + freezer beef), clear need (weak site / Messenger-only leads),
 * and priority geography.
 */
export function scoreProspect(p: ProspectSignals): { score: number; breakdown: Record<string, number> } {
  const b: Record<string, number> = {};
  if (p.sells_cattle) b.sells_cattle = 1.5;
  if (p.sells_beef) b.sells_beef = 1.5; // freezer beef = fast, visible liquidity win
  if (p.weak_website) b.weak_website = 1;
  if (p.active_social) b.active_social = 1;
  if (p.uses_messenger) b.needs_lead_capture = 1;
  if (p.runs_auctions) b.runs_auctions = 1;
  if (p.good_photos) b.listing_quality = 1;
  if (p.owner_operated) b.owner_operated = 0.5;
  const st = (p.state ?? "").trim().toUpperCase();
  if (TOP_REGIONS.includes(st)) b.priority_region = 1.5;
  else if (SECONDARY_REGIONS.includes(st)) b.region = 0.75;

  const raw = Object.values(b).reduce((s, n) => s + n, 0);
  const score = Math.max(1, Math.min(10, Math.round(raw)));
  return { score, breakdown: b };
}

/** Normalized key for duplicate detection: business name + state. */
export function dedupeKey(businessName: string, state?: string | null): string {
  const name = (businessName ?? "")
    .toLowerCase()
    .replace(/\b(ranch|ranches|cattle|co|company|llc|inc|farms?|livestock|the)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return `${name}|${(state ?? "").trim().toLowerCase()}`;
}

const TRUE = new Set(["y", "yes", "true", "1", "t", "x"]);
export function toBool(v: unknown): boolean {
  return TRUE.has(String(v ?? "").trim().toLowerCase());
}

/** Minimal correct CSV parser: handles quoted fields, escaped quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/\r\n?/g, "\n");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export type ParsedProspect = {
  business_name: string;
  contact_name?: string; email?: string; phone?: string; website?: string;
  social_url?: string; state?: string; county?: string; category?: string;
  what_they_sell?: string; source?: string; source_url?: string; notes?: string;
  sells_cattle: boolean; sells_beef: boolean; weak_website: boolean;
  active_social: boolean; uses_messenger: boolean; runs_auctions: boolean;
  good_photos: boolean; owner_operated: boolean;
};

const BOOL_COLS = new Set([
  "sells_cattle", "sells_beef", "weak_website", "active_social",
  "uses_messenger", "runs_auctions", "good_photos", "owner_operated",
]);

/**
 * Parse a prospect CSV into typed rows. Skips blank/comment (#) lines and rows
 * without a business name. Never invents values — unknown cells stay empty/false.
 */
export function parseProspectsCsv(text: string): ParsedProspect[] {
  const rows = parseCsv(text).filter((r) => r.some((c) => c.trim()) && !r[0].trim().startsWith("#"));
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const out: ParsedProspect[] = [];
  for (const r of rows.slice(1)) {
    const rec: Record<string, string> = {};
    header.forEach((h, i) => (rec[h] = (r[i] ?? "").trim()));
    const name = rec.business_name || rec.ranch_or_business_name || rec.name || "";
    if (!name) continue;
    const p: ParsedProspect = {
      business_name: name,
      contact_name: rec.contact_name || rec.owner_or_contact_name || undefined,
      email: rec.email || undefined,
      phone: rec.phone || undefined,
      website: rec.website || undefined,
      social_url: rec.social_url || rec.facebook_or_instagram_public_url || undefined,
      state: rec.state || rec.location_state || undefined,
      county: rec.county || rec.location_county || undefined,
      category: rec.category || undefined,
      what_they_sell: rec.what_they_sell || undefined,
      source: rec.source || "csv",
      source_url: rec.source_url || undefined,
      notes: rec.notes || undefined,
      sells_cattle: toBool(rec.sells_cattle), sells_beef: toBool(rec.sells_beef),
      weak_website: toBool(rec.weak_website), active_social: toBool(rec.active_social),
      uses_messenger: toBool(rec.uses_messenger), runs_auctions: toBool(rec.runs_auctions),
      good_photos: toBool(rec.good_photos), owner_operated: toBool(rec.owner_operated),
    };
    out.push(p);
  }
  return out;
}

/** Dedupe a batch against existing keys; returns rows to insert + skipped dups. */
export function splitDuplicates<T extends { business_name: string; state?: string }>(
  rows: T[],
  existingKeys: Set<string>,
): { fresh: T[]; duplicates: T[] } {
  const fresh: T[] = [];
  const duplicates: T[] = [];
  const seen = new Set(existingKeys);
  for (const r of rows) {
    const k = dedupeKey(r.business_name, r.state);
    if (seen.has(k)) duplicates.push(r);
    else { seen.add(k); fresh.push(r); }
  }
  return { fresh, duplicates };
}

export function stageCounts(prospects: { stage: string }[]): Record<Stage, number> {
  const counts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  for (const p of prospects) if (p.stage in counts) counts[p.stage as Stage]++;
  return counts;
}
