import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/types";
import { enqueueNotification } from "@/lib/notifications/enqueue";

/**
 * After an auction closes, email each winning bidder. Best-effort; safe to call
 * once per close (end_auction or the cron route). Uses the service-role client
 * so it can read winner emails across orgs.
 */
export async function notifyAuctionResults(
  admin: SupabaseClient<Database>,
  auctionId: string,
): Promise<void> {
  try {
    const { data: lots } = await admin
      .from("auction_lots")
      .select("id, title, current_bid_usd, current_bidder_id, organization_id")
      .eq("auction_id", auctionId)
      .eq("status", "sold");

    for (const lot of lots ?? []) {
      if (!lot.current_bidder_id) continue;
      const { data: winner } = await admin
        .from("profiles")
        .select("email")
        .eq("id", lot.current_bidder_id)
        .maybeSingle();
      await enqueueNotification({
        type: "auction_won",
        to: winner?.email ?? null,
        organizationId: lot.organization_id,
        data: { lotTitle: lot.title, amount: Number(lot.current_bid_usd ?? 0) },
      });
    }
  } catch {
    // Never let notification failures affect auction settlement.
  }
}
