import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { archiveListingAction } from "@/modules/admin/actions";

export const metadata: Metadata = { title: "Admin · Listings" };

export default async function AdminListingsPage() {
  const supabase = await createClient();
  const { data: listings } = await supabase
    .from("livestock_listings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Listings & moderation</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Review listings across the platform. Archiving removes a listing from the
        public marketplace.
      </p>
      <div className="grid gap-2">
        {(listings ?? []).map((l) => (
          <Card key={l.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-medium">{l.title}</p>
              <p className="text-sm text-muted-foreground">
                {l.seller_name} · {l.species}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Badge variant={l.status === "active" ? "success" : "outline"}>
                {l.status}
              </Badge>
              {l.status === "active" && (
                <form action={archiveListingAction}>
                  <input type="hidden" name="id" value={l.id} />
                  <Button type="submit" variant="destructive" size="sm">
                    Archive
                  </Button>
                </form>
              )}
            </div>
          </Card>
        ))}
        {(!listings || listings.length === 0) && (
          <p className="text-sm text-muted-foreground">No listings yet.</p>
        )}
      </div>
    </>
  );
}
