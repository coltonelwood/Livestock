// Discovery connector logic: source governance + Google Places normalization +
// result processing. Pure where possible; the API call takes an injectable
// fetch so it's unit-testable. No scraping — official API responses only.

// Local dedupe key (mirrors src/lib/agents/prospect-score.ts dedupeKey) — kept
// inline so this module stays Node-runnable without cross-extension imports.
function dedupeKey(businessName, state) {
  const name = (businessName ?? "")
    .toLowerCase()
    .replace(/\b(ranch|ranches|cattle|co|company|llc|inc|farms?|livestock|the)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return `${name}|${(state ?? "").trim().toLowerCase()}`;
}

/** A source may run only if approved, terms-allowed, enabled, and under its cap. */
export function canRunSource(source, runsToday = 0, now = Date.now()) {
  if (!source) return { allowed: false, reason: "no_source" };
  if (!source.enabled) return { allowed: false, reason: "disabled" };
  if (!source.approved_by_admin) return { allowed: false, reason: "not_approved" };
  if (!source.allowed_by_terms) return { allowed: false, reason: "terms_not_confirmed" };
  if (runsToday >= (source.rate_limit_per_day ?? 0)) return { allowed: false, reason: "rate_limit_exceeded" };
  return { allowed: true, reason: "ok" };
}

const US_STATE_RE = /,\s*([A-Z]{2})\s*\d{5}/; // "..., CO 80202"

/** Normalize one Google Places result to our shape (only allowed fields). */
export function normalizePlace(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = raw.displayName?.text || raw.name || raw.business_name || null;
  if (!name) return null;
  const address = raw.formattedAddress || raw.formatted_address || raw.address || null;
  const state = address ? (address.match(US_STATE_RE)?.[1] ?? null) : null;
  return {
    source: "google_places",
    source_id: raw.id || raw.place_id || null,
    business_name: name,
    website: raw.websiteUri || raw.website || null,
    phone: raw.nationalPhoneNumber || raw.internationalPhoneNumber || raw.formatted_phone_number || null,
    address,
    state,
    raw: { types: raw.types ?? raw.primaryType ?? null, rating: raw.rating ?? null },
  };
}

/**
 * Process a batch of normalized results against what we already have. Pure:
 * categorizes into staged / duplicates / rejected, scores by available info,
 * and flags which are eligible to enrich via the website extractor. Never
 * contacts anyone; everything it stages is at 'discovered'.
 *
 * @param {Array<Record<string, unknown>>} results
 * @param {{
 *   existingPlaceIds?: Set<string>,
 *   existingDedupeKeys?: Set<string>,
 *   scoreFn?: (signals: Record<string, unknown>) => { score: number },
 *   allowExtractor?: boolean,
 * }} [opts]
 * @returns {{
 *   staged: Array<{ source: string, source_id: string|null, business_name: string, website: string|null, phone: string|null, address: string|null, state: string|null, raw: Record<string, unknown>, dedupe_key: string, fit_score: number, confidence: number, enrich_eligible: boolean, reason: string }>,
 *   duplicates: Array<{ source: string, source_id: string|null, business_name: string, website: string|null, phone: string|null, address: string|null, state: string|null, raw: Record<string, unknown> }>,
 *   rejected: Array<{ r: unknown, reason: string }>,
 * }}
 */
export function processResults(results, {
  existingPlaceIds = new Set(), existingDedupeKeys = new Set(),
  scoreFn, allowExtractor = false,
} = {}) {
  const seenPlace = new Set(existingPlaceIds);
  const seenKey = new Set(existingDedupeKeys);
  const staged = [], duplicates = [], rejected = [];
  for (const r of results) {
    if (!r || !r.business_name) { rejected.push({ r, reason: "invalid_no_name" }); continue; }
    const key = dedupeKey(r.business_name, r.state);
    if ((r.source_id && seenPlace.has(r.source_id)) || seenKey.has(key)) { duplicates.push(r); continue; }
    if (r.source_id) seenPlace.add(r.source_id);
    seenKey.add(key);
    // Limited signals from Places alone: geography + has-website. Real signals
    // come later from the (governed) website extractor.
    const signals = { state: r.state, sells_cattle: false, sells_beef: false, weak_website: !r.website };
    const { score } = scoreFn ? scoreFn(signals) : { score: 1 };
    staged.push({
      ...r, dedupe_key: key, fit_score: score,
      confidence: r.website ? 0.5 : 0.3,
      enrich_eligible: allowExtractor && !!r.website,
      reason: "official_api:google_places",
    });
  }
  return { staged, duplicates, rejected };
}

export function summarize(processed) {
  const highFit = processed.staged.filter((s) => (s.fit_score ?? 0) >= 6).length;
  return {
    total: processed.staged.length + processed.duplicates.length + processed.rejected.length,
    duplicates_removed: processed.duplicates.length,
    staged: processed.staged.length,
    high_fit: highFit,
    rejected: processed.rejected.length,
  };
}

/**
 * Google Places Text Search (official API). Returns normalized results or
 * throws on missing key / API error. `fetchImpl` injectable for tests.
 *
 * @param {string} apiKey
 * @param {string} query
 * @param {{ region?: string, fetchImpl?: (url: string, init?: unknown) => Promise<{ ok: boolean, status?: number, json: () => Promise<any> }>, pageSize?: number }} [opts]
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function placesTextSearch(apiKey, query, { region = "us", fetchImpl = fetch, pageSize = 20 } = {}) {
  if (!apiKey) throw new Error("missing_api_key");
  const res = await fetchImpl("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.types,places.rating",
    },
    body: JSON.stringify({ textQuery: query, pageSize, regionCode: region }),
  });
  if (!res.ok) {
    let detail = ""; try { detail = JSON.stringify(await res.json()).slice(0, 200); } catch {}
    throw new Error(`places_api_error_${res.status}:${detail}`);
  }
  const data = await res.json();
  return (data.places ?? []).map(normalizePlace).filter(Boolean);
}
