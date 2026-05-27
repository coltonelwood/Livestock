import { describe, expect, it } from "vitest";

import {
  canRunSource, normalizePlace, processResults, summarize, placesTextSearch,
} from "../../../agents/lib/discovery.mjs";
import { scoreProspect } from "@/lib/agents/prospect-score";

const armed = { enabled: true, approved_by_admin: true, allowed_by_terms: true, rate_limit_per_day: 50 };

describe("source governance", () => {
  it("requires approval, terms, enabled, and headroom — in that spirit", () => {
    expect(canRunSource(armed, 0).allowed).toBe(true);
    expect(canRunSource({ ...armed, enabled: false }, 0).reason).toBe("disabled");
    expect(canRunSource({ ...armed, approved_by_admin: false }, 0).reason).toBe("not_approved");
    expect(canRunSource({ ...armed, allowed_by_terms: false }, 0).reason).toBe("terms_not_confirmed");
    expect(canRunSource(armed, 50).reason).toBe("rate_limit_exceeded");
    expect(canRunSource(null).reason).toBe("no_source");
  });
});

describe("places normalization (allowed fields only)", () => {
  it("maps a v1 Places result; pulls state from address", () => {
    const n = normalizePlace({ id: "p1", displayName: { text: "Elk Ridge Beef" }, websiteUri: "https://elkridgebeef.com", nationalPhoneNumber: "(970) 555-0142", formattedAddress: "1 Rd, Montrose, CO 81401", types: ["food"] });
    expect(n).toMatchObject({ source: "google_places", source_id: "p1", business_name: "Elk Ridge Beef", website: "https://elkridgebeef.com", state: "CO" });
  });
  it("rejects nameless / non-object results", () => {
    expect(normalizePlace({ id: "x" })).toBeNull();
    expect(normalizePlace(null)).toBeNull();
  });
});

describe("result processing: dedup, invalid, staging, extractor-eligibility", () => {
  const results = [
    { source: "google_places", source_id: "p1", business_name: "Cross Creek Cattle Co", state: "KS", website: "https://crosscreek.example" },
    { source: "google_places", source_id: "p1", business_name: "Cross Creek (dup place id)", state: "KS" }, // dup place_id
    { source: "google_places", source_id: "p2", business_name: "Cross Creek Ranch", state: "KS" },          // dup by name+state
    { source: "google_places", source_id: "p3", business_name: "Elk Ridge Beef", state: "CO", website: "https://elk.example" },
    { source: "google_places", source_id: "p4" }, // invalid (no name)
  ];
  it("dedupes place_id + website/name, drops invalid, stages the rest", () => {
    const out = processResults(results, { scoreFn: scoreProspect, allowExtractor: true });
    expect(out.staged.map((s) => s.source_id).sort()).toEqual(["p1", "p3"]);
    expect(out.duplicates).toHaveLength(2);
    expect(out.rejected[0].reason).toBe("invalid_no_name");
  });
  it("dedupes against EXISTING prospects too", () => {
    const out = processResults(results, { scoreFn: scoreProspect, existingPlaceIds: new Set(["p1"]) });
    expect(out.staged.find((s) => s.source_id === "p1")).toBeUndefined();
  });
  it("flags extractor eligibility only when policy allows AND a website exists", () => {
    const yes = processResults([results[0]], { scoreFn: scoreProspect, allowExtractor: true });
    const no = processResults([results[0]], { scoreFn: scoreProspect, allowExtractor: false });
    expect(yes.staged[0].enrich_eligible).toBe(true);
    expect(no.staged[0].enrich_eligible).toBe(false);
  });
  it("stages with attribution + a 'discovered' (not contacted) posture", () => {
    const out = processResults([results[0]], { scoreFn: scoreProspect });
    expect(out.staged[0].source).toBe("google_places");
    expect(out.staged[0].reason).toContain("official_api");
    // nothing here sends/contacts — staging only produces data.
  });
  it("summarizes a run", () => {
    const out = processResults(results, { scoreFn: scoreProspect });
    expect(summarize(out)).toMatchObject({ total: 5, duplicates_removed: 2, staged: 2, rejected: 1 });
  });
});

describe("placesTextSearch (official API, injectable fetch)", () => {
  it("throws clearly when the API key is missing", async () => {
    await expect(placesTextSearch("", "cattle ranch CO")).rejects.toThrow(/missing_api_key/);
  });
  it("handles a Google API error", async () => {
    const fakeFetch = async () => ({ ok: false, status: 403, json: async () => ({ error: "denied" }) });
    await expect(placesTextSearch("key", "q", { fetchImpl: fakeFetch })).rejects.toThrow(/places_api_error_403/);
  });
  it("parses a successful response into normalized results", async () => {
    const fakeFetch = async () => ({ ok: true, json: async () => ({ places: [{ id: "p1", displayName: { text: "A Ranch" }, formattedAddress: "x, WY 82001" }] }) });
    const r = await placesTextSearch("key", "q", { fetchImpl: fakeFetch });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ business_name: "A Ranch", state: "WY", source: "google_places" });
  });
});
