import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { cancelAuctionAdminAction } from "@/modules/admin/actions";

export const metadata: Metadata = { title: "Admin · Auctions" };

export default async function AdminAuctionsPage() {
  const supabase = await createClient();
  const { data: auctions } = await supabase
    .from("auctions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Auctions &amp; moderation</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Cancel a sale to pull it and its open lots from the public catalog.
      </p>
      <div className="grid gap-2">
        {(auctions ?? []).map((a) => (
          <Card key={a.id} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="truncate font-medium">{a.title}</p>
              <p className="text-sm text-muted-foreground">{a.location ?? "—"}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Badge variant={a.status === "live" ? "success" : "outline"}>{a.status}</Badge>
              {a.status !== "cancelled" && a.status !== "ended" && (
                <form action={cancelAuctionAdminAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <Button type="submit" variant="destructive" size="sm">Cancel sale</Button>
                </form>
              )}
            </div>
          </Card>
        ))}
        {(!auctions || auctions.length === 0) && (
          <p className="text-sm text-muted-foreground">No auctions yet.</p>
        )}
      </div>
    </>
  );
}
