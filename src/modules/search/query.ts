/**
 * Pure search/filter/pagination helpers. No DB or framework imports, so every
 * branch is unit-testable. Pages parse URL search params through these, then
 * apply the result to a Supabase query. All values are validated/clamped here
 * so invalid query params can never reach the database as something unsafe.
 */

export const PAGE_SIZE = 12;

export type SortKey = "newest" | "price_asc" | "price_desc";
const SORT_KEYS: SortKey[] = ["newest", "price_asc", "price_desc"];

export const SPECIES = [
  "cattle",
  "sheep",
  "goat",
  "horse",
  "swine",
  "poultry",
  "other",
] as const;
export type Species = (typeof SPECIES)[number];

export const PRODUCT_TYPES = [
  "quarter",
  "half",
  "whole",
  "retail_cut",
  "bundle",
  "other",
] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const AUCTION_STATUSES = ["live", "scheduled", "ended"] as const;
export type AuctionStatusFilter = (typeof AUCTION_STATUSES)[number];

type Params = Record<string, string | string[] | undefined>;

function str(p: Params, key: string): string | undefined {
  const v = p[key];
  const s = Array.isArray(v) ? v[0] : v;
  const trimmed = s?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

/** Strip characters that would break a PostgREST ilike/or filter. */
export function sanitizeText(v: string | undefined, max = 80): string | undefined {
  if (!v) return undefined;
  const cleaned = v.replace(/[%,()*\\]/g, "").trim().slice(0, max);
  return cleaned.length > 0 ? cleaned : undefined;
}

export function parsePage(v: string | string[] | undefined): number {
  const s = Array.isArray(v) ? v[0] : v;
  const n = Number(s);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export function parsePrice(v: string | undefined): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function parseSort(v: string | undefined): SortKey {
  return SORT_KEYS.includes(v as SortKey) ? (v as SortKey) : "newest";
}

function oneOf<T extends string>(v: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.includes(v as T) ? (v as T) : undefined;
}

/** DB range (inclusive) for a page, for Supabase `.range(from, to)`. */
export function rangeFor(page: number, pageSize = PAGE_SIZE): { from: number; to: number } {
  const safePage = page >= 1 ? page : 1;
  const from = (safePage - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

export function totalPages(count: number, pageSize = PAGE_SIZE): number {
  return Math.max(1, Math.ceil((count || 0) / pageSize));
}

export type ListingFilters = {
  q?: string;
  species?: Species;
  breed?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  sort: SortKey;
  page: number;
};

export function parseListingFilters(p: Params): ListingFilters {
  return {
    q: sanitizeText(str(p, "q")),
    species: oneOf(str(p, "species"), SPECIES),
    breed: sanitizeText(str(p, "breed"), 60),
    location: sanitizeText(str(p, "location"), 60),
    minPrice: parsePrice(str(p, "min")),
    maxPrice: parsePrice(str(p, "max")),
    sort: parseSort(str(p, "sort")),
    page: parsePage(p["page"]),
  };
}

export type ProductFilters = {
  q?: string;
  productType?: ProductType;
  minPrice?: number;
  maxPrice?: number;
  inStock: boolean;
  sort: SortKey;
  page: number;
};

export function parseProductFilters(p: Params): ProductFilters {
  return {
    q: sanitizeText(str(p, "q")),
    productType: oneOf(str(p, "type"), PRODUCT_TYPES),
    minPrice: parsePrice(str(p, "min")),
    maxPrice: parsePrice(str(p, "max")),
    inStock: str(p, "stock") === "1",
    sort: parseSort(str(p, "sort")),
    page: parsePage(p["page"]),
  };
}

export type AuctionFilters = {
  q?: string;
  status?: AuctionStatusFilter;
  location?: string;
  page: number;
};

export function parseAuctionFilters(p: Params): AuctionFilters {
  return {
    q: sanitizeText(str(p, "q")),
    status: oneOf(str(p, "status"), AUCTION_STATUSES),
    location: sanitizeText(str(p, "location"), 60),
    page: parsePage(p["page"]),
  };
}

/** Build a query string from a params object, dropping empties. */
export function buildQueryString(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && `${v}`.length > 0) sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
