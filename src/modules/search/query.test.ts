import { describe, expect, it } from "vitest";

import {
  parsePage,
  parsePrice,
  parseSort,
  rangeFor,
  totalPages,
  sanitizeText,
  parseListingFilters,
  parseProductFilters,
  parseAuctionFilters,
  buildQueryString,
  PAGE_SIZE,
} from "@/modules/search/query";

describe("query param parsing is safe", () => {
  it("clamps page to >= 1 and rejects junk", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-5")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage(undefined)).toBe(1);
  });

  it("rejects negative / non-numeric prices", () => {
    expect(parsePrice("100")).toBe(100);
    expect(parsePrice("-1")).toBeUndefined();
    expect(parsePrice("abc")).toBeUndefined();
    expect(parsePrice(undefined)).toBeUndefined();
  });

  it("whitelists sort keys", () => {
    expect(parseSort("price_asc")).toBe("price_asc");
    expect(parseSort("drop table")).toBe("newest");
    expect(parseSort(undefined)).toBe("newest");
  });

  it("strips characters that would break ilike/or filters", () => {
    expect(sanitizeText("angus%,(steers)")).toBe("angussteers");
    expect(sanitizeText("   ")).toBeUndefined();
  });
});

describe("pagination math", () => {
  it("computes DB ranges", () => {
    expect(rangeFor(1)).toEqual({ from: 0, to: PAGE_SIZE - 1 });
    expect(rangeFor(2)).toEqual({ from: PAGE_SIZE, to: 2 * PAGE_SIZE - 1 });
    expect(rangeFor(0)).toEqual({ from: 0, to: PAGE_SIZE - 1 });
  });

  it("computes total pages", () => {
    expect(totalPages(0)).toBe(1);
    expect(totalPages(PAGE_SIZE)).toBe(1);
    expect(totalPages(PAGE_SIZE + 1)).toBe(2);
  });
});

describe("filter parsers", () => {
  it("parses listing filters and ignores invalid species", () => {
    const f = parseListingFilters({
      q: "angus", species: "cattle", min: "1000", max: "5000", sort: "price_desc", page: "2",
    });
    expect(f).toMatchObject({ q: "angus", species: "cattle", minPrice: 1000, maxPrice: 5000, sort: "price_desc", page: 2 });
    expect(parseListingFilters({ species: "dragon" }).species).toBeUndefined();
  });

  it("parses product filters incl. in-stock toggle", () => {
    expect(parseProductFilters({ type: "half", stock: "1" })).toMatchObject({ productType: "half", inStock: true });
    expect(parseProductFilters({ type: "nope" }).productType).toBeUndefined();
  });

  it("parses auction status filter", () => {
    expect(parseAuctionFilters({ status: "live" }).status).toBe("live");
    expect(parseAuctionFilters({ status: "explode" }).status).toBeUndefined();
  });
});

describe("buildQueryString", () => {
  it("drops empty values", () => {
    expect(buildQueryString({ q: "angus", species: undefined, page: 2, x: "" })).toBe("?q=angus&page=2");
    expect(buildQueryString({})).toBe("");
  });
});
