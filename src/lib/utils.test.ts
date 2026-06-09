import { describe, expect, it } from "vitest";

import { cn, formatUtc } from "@/lib/utils";

describe("formatUtc", () => {
  it("renders a deterministic UTC timestamp", () => {
    expect(formatUtc("2026-05-27T17:41:36.000Z")).toBe("May 27, 2026 17:41 UTC");
    expect(formatUtc("2026-01-02T03:04:00+02:00")).toBe("Jan 2, 2026 01:04 UTC");
  });
  it("returns a dash for missing or invalid input", () => {
    expect(formatUtc(null)).toBe("—");
    expect(formatUtc(undefined)).toBe("—");
    expect(formatUtc("not a date")).toBe("—");
  });
});

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("dedupes conflicting tailwind classes (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles conditional and falsy values", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });
});
