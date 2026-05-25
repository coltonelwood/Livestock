"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { requireOrg, isOrgAdmin } from "@/modules/organizations/context";
import { canAccessAuctionTools } from "@/modules/billing/entitlements";
import { enforce } from "@/lib/ratelimit";
import {
  createAuctionSchema,
  createLotSchema,
  placeBidSchema,
  bidErrorMessage,
  type AuctionActionState,
  type BidState,
} from "@/modules/auctions/schema";

/** Owners/admins on an Enterprise plan may run auctions. */
async function requireAuctionManager() {
  const ctx = await requireOrg();
  if (!isOrgAdmin(ctx.role)) {
    return { ctx, error: "Only owners and admins can manage auctions." as const };
  }
  if (!(await canAccessAuctionTools())) {
    return { ctx, error: "Auctions are part of the Enterprise plan." as const };
  }
  return { ctx, error: null };
}

export async function createAuctionAction(
  _prev: AuctionActionState,
  formData: FormData,
): Promise<AuctionActionState> {
  const { ctx, error: gate } = await requireAuctionManager();
  if (gate) return { error: gate };

  const parsed = createAuctionSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    location: formData.get("location"),
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid details" };

  const starts = new Date(parsed.data.starts_at);
  const ends = new Date(parsed.data.ends_at);
  if (ends <= starts) return { error: "The sale must end after it starts." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("auctions")
    .insert({
      organization_id: ctx.organization.id,
      title: parsed.data.title,
      description: parsed.data.description,
      location: parsed.data.location,
      status: "scheduled",
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Could not create the sale. Please try again." };

  revalidatePath("/dashboard/auctions");
  redirect(`/dashboard/auctions/${data.id}`);
}

export async function addLotAction(
  _prev: AuctionActionState,
  formData: FormData,
): Promise<AuctionActionState> {
  const { ctx, error: gate } = await requireAuctionManager();
  if (gate) return { error: gate };

  const auctionId = String(formData.get("auctionId") ?? "");
  const parsed = createLotSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    species: formData.get("species") ?? "cattle",
    head_count: formData.get("head_count"),
    opening_bid_usd: formData.get("opening_bid_usd"),
    reserve_price_usd: formData.get("reserve_price_usd"),
    bid_increment_usd: formData.get("bid_increment_usd"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid details" };

  const supabase = await createClient();

  // Verify the auction belongs to this org and is still editable.
  const { data: auction } = await supabase
    .from("auctions")
    .select("id, status, organization_id")
    .eq("id", auctionId)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();
  if (!auction) return { error: "Sale not found." };
  if (auction.status !== "scheduled") {
    return { error: "Lots can only be added before the sale goes live." };
  }

  // Next lot number.
  const { data: last } = await supabase
    .from("auction_lots")
    .select("lot_number")
    .eq("auction_id", auctionId)
    .order("lot_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextNumber = (last?.lot_number ?? 0) + 1;

  const { error } = await supabase.from("auction_lots").insert({
    auction_id: auctionId,
    organization_id: ctx.organization.id,
    lot_number: nextNumber,
    ...parsed.data,
  });
  if (error) return { error: "Could not add the lot. Please try again." };

  revalidatePath(`/dashboard/auctions/${auctionId}`);
  return {};
}

export async function startAuctionAction(formData: FormData) {
  const { error: gate } = await requireAuctionManager();
  if (gate) return;
  const id = String(formData.get("auctionId") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.rpc("start_auction", { p_auction: id });
  revalidatePath(`/dashboard/auctions/${id}`);
  revalidatePath(`/auctions/${id}`);
}

export async function endAuctionAction(formData: FormData) {
  const { error: gate } = await requireAuctionManager();
  if (gate) return;
  const id = String(formData.get("auctionId") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.rpc("end_auction", { p_auction: id });
  revalidatePath(`/dashboard/auctions/${id}`);
  revalidatePath(`/auctions/${id}`);
}

export async function cancelAuctionAction(formData: FormData) {
  const { error: gate } = await requireAuctionManager();
  if (gate) return;
  const id = String(formData.get("auctionId") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.rpc("cancel_auction", { p_auction: id });
  revalidatePath(`/dashboard/auctions/${id}`);
  revalidatePath(`/auctions/${id}`);
}

export async function cancelLotAction(formData: FormData) {
  const { error: gate } = await requireAuctionManager();
  if (gate) return;
  const lotId = String(formData.get("lotId") ?? "");
  const auctionId = String(formData.get("auctionId") ?? "");
  if (!lotId) return;
  const supabase = await createClient();
  await supabase.rpc("cancel_lot", { p_lot: lotId });
  revalidatePath(`/dashboard/auctions/${auctionId}`);
}

/** Public-facing: place a bid. Any authenticated user (not the seller) may bid. */
export async function placeBidAction(
  _prev: BidState,
  formData: FormData,
): Promise<BidState> {
  const user = await requireUser();

  const gate = await enforce(
    [{ name: "bid", identifier: user.id }],
    { failOpen: true },
  );
  if (!gate.allowed) return { error: "You're bidding too fast — give it a second." };

  const parsed = placeBidSchema.safeParse({
    lotId: formData.get("lotId"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) return { error: "Enter a valid bid amount." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_bid", {
    p_lot_id: parsed.data.lotId,
    p_amount: parsed.data.amount,
  });

  if (error) return { error: bidErrorMessage(error.message) };

  revalidatePath(`/auctions`);
  return {
    ok: true,
    currentBid: data?.current_bid,
    minNextBid: data?.min_next_bid,
  };
}
