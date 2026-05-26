import { describe, expect, it } from "vitest";

import {
  scoreProspect, dedupeKey, parseProspectsCsv, parseCsv,
  splitDuplicates, stageCounts, toBool, STAGES,
} from "@/lib/agents/prospect-score";

describe("prospect scoring", () => {
  it("rewards real liquidity value + priority geography, clamps 1..10", () => {
    const max = scoreProspect({
      sells_cattle: true, sells_beef: true, weak_website: true, active_social: true,
      uses_messenger: true, runs_auctions: true, good_photos: true, owner_operated: true, state: "CO",
    });
    expect(max.score).toBe(10);
    expect(max.breakdown.priority_region).toBe(1.5);

    const min = scoreProspect({});
    expect(min.score).toBe(1); // clamped up from 0

    const beefCO = scoreProspect({ sells_beef: true, state: "WY" });
    expect(beefCO.breakdown.sells_beef).toBe(1.5);
    expect(beefCO.breakdown.priority_region).toBe(1.5);
  });

  it("scores secondary regions lower than top regions", () => {
    const co = scoreProspect({ sells_cattle: true, state: "CO" }).score;
    const ks = scoreProspect({ sells_cattle: true, state: "KS" }).score;
    expect(co).toBeGreaterThanOrEqual(ks);
  });
});

describe("dedup", () => {
  it("normalizes business names so variants collide", () => {
    expect(dedupeKey("Cross Creek Cattle Co.", "KS")).toBe(dedupeKey("cross creek ranch", "ks"));
    expect(dedupeKey("Bar 7 Ranch", "TX")).not.toBe(dedupeKey("Bar 8 Ranch", "TX"));
  });
  it("splits a batch against existing keys", () => {
    const existing = new Set([dedupeKey("Cross Creek", "KS")]);
    const { fresh, duplicates } = splitDuplicates(
      [{ business_name: "Cross Creek Cattle Co", state: "KS" }, { business_name: "High Plains", state: "MT" }],
      existing,
    );
    expect(duplicates).toHaveLength(1);
    expect(fresh).toHaveLength(1);
  });
});

describe("CSV ingestion", () => {
  it("parses quoted fields with commas and escaped quotes", () => {
    const rows = parseCsv('a,b\n"x,1","he said ""hi"""\n');
    expect(rows[1]).toEqual(["x,1", 'he said "hi"']);
  });
  it("maps headers, coerces booleans, skips comments + nameless rows", () => {
    const csv = [
      "business_name,state,sells_beef,uses_messenger,good_photos",
      "# comment line",
      "Elk Ridge Beef,CO,yes,Y,1",
      ",WY,no,no,no",
    ].join("\n");
    const parsed = parseProspectsCsv(csv);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ business_name: "Elk Ridge Beef", state: "CO", sells_beef: true, uses_messenger: true, good_photos: true });
  });
  it("toBool understands common truthy tokens only", () => {
    expect(["y", "yes", "true", "1"].every(toBool)).toBe(true);
    expect(["n", "no", "", "maybe"].some(toBool)).toBe(false);
  });
});

describe("pipeline counts", () => {
  it("tallies stages over the full vocabulary", () => {
    const counts = stageCounts([{ stage: "discovered" }, { stage: "active" }, { stage: "active" }]);
    expect(counts.active).toBe(2);
    expect(counts.discovered).toBe(1);
    expect(Object.keys(counts)).toEqual([...STAGES]);
  });
});
