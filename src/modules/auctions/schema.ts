import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v && v.length ? v : null));

const money = z
  .string()
  .optional()
  .transform((v) => (v && v.length ? Number(v) : null))
  .pipe(z.number().nonnegative().nullable());

export const createAuctionSchema = z.object({
  title: z.string().trim().min(3, "Enter a sale title").max(160),
  description: optionalText(4000),
  location: optionalText(160),
  starts_at: z.string().min(1, "Pick a start time"),
  ends_at: z.string().min(1, "Pick an end time"),
});

export const createLotSchema = z.object({
  title: z.string().trim().min(2, "Enter a lot title").max(160),
  description: optionalText(2000),
  species: z
    .enum(["cattle", "sheep", "goat", "horse", "swine", "poultry", "other"])
    .default("cattle"),
  head_count: z
    .string()
    .optional()
    .transform((v) => (v && v.length ? Number(v) : 1))
    .pipe(z.number().int().positive()),
  opening_bid_usd: z
    .string()
    .optional()
    .transform((v) => (v && v.length ? Number(v) : 0))
    .pipe(z.number().nonnegative()),
  reserve_price_usd: money,
  bid_increment_usd: z
    .string()
    .optional()
    .transform((v) => (v && v.length ? Number(v) : 25))
    .pipe(z.number().positive()),
});

export const placeBidSchema = z.object({
  lotId: z.string().uuid(),
  amount: z.coerce.number().positive(),
});

export type AuctionActionState = { error?: string };
export type BidState = {
  error?: string;
  ok?: boolean;
  currentBid?: number;
  minNextBid?: number;
};

/** Minimum acceptable next bid (mirrors the server's place_bid logic). */
export function minimumBid(
  currentBid: number | null,
  openingBid: number,
  increment: number,
): number {
  return currentBid == null ? openingBid : currentBid + increment;
}

/** True if a live auction has reached its end time and should be closed. */
export function isAuctionDue(
  endsAt: string | null,
  nowMs: number = Date.now(),
): boolean {
  if (!endsAt) return false;
  const t = new Date(endsAt).getTime();
  return Number.isFinite(t) && t <= nowMs;
}

/** Map a place_bid() error message to friendly buyer-facing copy. */
export function bidErrorMessage(raw: string): string {
  if (raw.startsWith("BID_TOO_LOW")) {
    const min = raw.split(":")[1];
    return min
      ? `Your bid must be at least $${Number(min).toLocaleString()}.`
      : "Your bid is too low.";
  }
  const map: Record<string, string> = {
    AUTH_REQUIRED: "Please log in to place a bid.",
    AUCTION_NOT_LIVE: "This auction isn't accepting bids right now.",
    LOT_NOT_OPEN: "This lot is no longer open for bidding.",
    LOT_CLOSED: "Bidding on this lot has closed.",
    LOT_NOT_FOUND: "That lot could not be found.",
    SELF_BID_FORBIDDEN: "You can't bid on your own lot.",
  };
  for (const key of Object.keys(map)) {
    if (raw.includes(key)) return map[key];
  }
  return "Could not place your bid. Please try again.";
}
