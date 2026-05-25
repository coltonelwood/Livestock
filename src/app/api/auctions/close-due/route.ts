import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isAuctionDue } from "@/modules/auctions/schema";

export const runtime = "nodejs";

/**
 * Cron-compatible auto-close. Closes any live auction whose end time has passed
 * (settling lots against reserve). Point a Vercel Cron (or any scheduler) at
 * this route. Secured by CRON_SECRET — without it, the route is disabled
 * (fail closed) so it can never be triggered anonymously.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron not configured." }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: live } = await admin
    .from("auctions")
    .select("id, ends_at")
    .eq("status", "live");

  const now = Date.now();
  const due = (live ?? []).filter((a) => isAuctionDue(a.ends_at, now));

  let closed = 0;
  for (const a of due) {
    const { error } = await admin.rpc("close_auction", { p_auction: a.id });
    if (!error) closed += 1;
  }

  return NextResponse.json({ checked: live?.length ?? 0, closed });
}
