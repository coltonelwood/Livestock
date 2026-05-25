import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InquiryForm } from "@/modules/listings/components/inquiry-form";
import { MediaImage } from "@/modules/media/components/media-image";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("livestock_listings")
    .select("title")
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();
  return { title: data?.title ?? "Listing" };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("livestock_listings")
    .select("*")
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();

  if (!listing) notFound();

  return (
    <div className="container max-w-4xl py-12">
      <Link
        href="/listings"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All listings
      </Link>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <MediaImage photos={listing.photos} alt={listing.title} className="mb-5" />
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{listing.title}</h1>
            <Badge variant="outline">{listing.species}</Badge>
          </div>
          <p className="mt-2 text-2xl font-semibold text-primary">
            {listing.price_usd == null
              ? "Contact for price"
              : `$${listing.price_usd.toLocaleString()}`}
          </p>
          <dl className="mt-6 space-y-2 text-sm">
            {listing.breed && (
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Breed:</dt>
                <dd>{listing.breed}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Quantity:</dt>
              <dd>{listing.quantity}</dd>
            </div>
            {listing.location && (
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Location:</dt>
                <dd>{listing.location}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Seller:</dt>
              <dd>
                <Link href={`/ranch/${listing.organization_id}`} className="text-primary hover:underline">
                  {listing.seller_name}
                </Link>
              </dd>
            </div>
          </dl>
          {listing.description && (
            <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed">
              {listing.description}
            </p>
          )}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Contact the seller</CardTitle>
            </CardHeader>
            <CardContent>
              <InquiryForm listingType="livestock" listingId={listing.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
