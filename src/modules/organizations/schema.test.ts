import { describe, expect, it } from "vitest";

import { createOrgSchema, slugify } from "@/modules/organizations/schema";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Cross Creek Cattle Co.")).toBe("cross-creek-cattle-co");
  });

  it("strips leading/trailing separators and collapses runs", () => {
    expect(slugify("  --Big Sky--  ")).toBe("big-sky");
  });

  it("falls back to 'ranch' when empty", () => {
    expect(slugify("!!!")).toBe("ranch");
  });
});

describe("createOrgSchema", () => {
  it("accepts a valid org", () => {
    const r = createOrgSchema.safeParse({
      name: "Bar X Ranch",
      businessType: "ranch",
    });
    expect(r.success).toBe(true);
  });

  it("rejects an unknown business type", () => {
    const r = createOrgSchema.safeParse({
      name: "Bar X Ranch",
      businessType: "spaceship",
    });
    expect(r.success).toBe(false);
  });

  it("rejects a too-short name", () => {
    const r = createOrgSchema.safeParse({ name: "X", businessType: "ranch" });
    expect(r.success).toBe(false);
  });
});
