import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/modules/dashboard/components/page-header";
import { PhotosManager } from "@/modules/media/components/photos-manager";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/modules/organizations/context";

export const metadata: Metadata = { title: "Edit listing" };

export default async function ListingEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organization } = await requireOrg();
  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("livestock_listings")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!listing) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard/listings" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All listings
      </Link>
      <PageHeader
        title={listing.title}
        description={`${listing.species}${listing.breed ? ` · ${listing.breed}` : ""}`}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={listing.status === "active" ? "success" : "secondary"}>{listing.status}</Badge>
            {listing.status === "active" && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/listings/${listing.id}`} target="_blank">
                  Public page <ExternalLink className="size-4" />
                </Link>
              </Button>
            )}
          </div>
        }
      />
      <PhotosManager entityType="listing" entityId={listing.id} photos={listing.photos ?? []} />
    </div>
  );
}
