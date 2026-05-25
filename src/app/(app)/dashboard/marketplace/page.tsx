import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/modules/dashboard/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/modules/organizations/context";

export const metadata: Metadata = { title: "Marketplace preview" };

export default async function MarketplacePreviewPage() {
  const { organization } = await requireOrg();
  const supabase = await createClient();
  const head = { count: "exact" as const, head: true };
  const [{ count: activeListings }, { count: activeProducts }] = await Promise.all([
    supabase.from("livestock_listings").select("id", head).eq("organization_id", organization.id).eq("status", "active"),
    supabase.from("meat_products").select("id", head).eq("organization_id", organization.id).eq("status", "active"),
  ]);

  return (
    <>
      <PageHeader
        title="Marketplace preview"
        description="See how your business appears to buyers."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Livestock marketplace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-bold">{activeListings ?? 0}</p>
            <p className="text-sm text-muted-foreground">active livestock listings</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/listings" target="_blank">
                View public marketplace <ExternalLink className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Beef direct</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-bold">{activeProducts ?? 0}</p>
            <p className="text-sm text-muted-foreground">active beef products</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/beef" target="_blank">
                View beef storefront <ExternalLink className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
