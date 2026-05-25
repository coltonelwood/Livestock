import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/modules/dashboard/components/page-header";
import { ActionForm } from "@/components/action-form";
import { PhotosManager } from "@/modules/media/components/photos-manager";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/modules/organizations/context";
import {
  deleteListingAction,
  updateListingAction,
} from "@/modules/listings/actions";
import type { ListingActionState } from "@/modules/listings/schema";

export const metadata: Metadata = { title: "Edit listing" };

const species = ["cattle", "sheep", "goat", "horse", "swine", "poultry", "other"];

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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Listing details</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm<ListingActionState> action={updateListingAction} submitLabel="Save changes">
            <input type="hidden" name="id" value={listing.id} />
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={listing.title ?? ""} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="species">Species</Label>
                <Select id="species" name="species" defaultValue={listing.species ?? "cattle"}>
                  {species.map((s) => (
                    <option key={s} value={s}>
                      {s[0].toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="breed">Breed</Label>
                <Input id="breed" name="breed" defaultValue={listing.breed ?? ""} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" name="quantity" type="number" min="1" defaultValue={listing.quantity ?? 1} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_usd">Price (USD)</Label>
                <Input id="price_usd" name="price_usd" type="number" min="0" step="0.01" defaultValue={listing.price_usd ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" defaultValue={listing.location ?? ""} placeholder="County, State" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={4} defaultValue={listing.description ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Visibility</Label>
              <Select id="status" name="status" defaultValue={listing.status === "active" ? "active" : "draft"}>
                <option value="active">Published (shown in the marketplace)</option>
                <option value="draft">Unpublished (hidden draft)</option>
              </Select>
            </div>
          </ActionForm>
        </CardContent>
      </Card>

      <PhotosManager entityType="listing" entityId={listing.id} photos={listing.photos ?? []} />

      <Card className="mt-6 border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Delete listing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Permanently removes this listing and its inquiries link. This can&apos;t be undone.
          </p>
          <form action={deleteListingAction}>
            <input type="hidden" name="id" value={listing.id} />
            <Button type="submit" variant="destructive" size="sm">Delete listing</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
