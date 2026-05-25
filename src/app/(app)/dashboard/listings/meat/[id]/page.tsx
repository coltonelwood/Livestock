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
  deleteMeatProductAction,
  updateMeatProductAction,
} from "@/modules/listings/actions";
import type { ListingActionState } from "@/modules/listings/schema";

export const metadata: Metadata = { title: "Edit product" };

const types = [
  { value: "quarter", label: "Quarter" },
  { value: "half", label: "Half" },
  { value: "whole", label: "Whole" },
  { value: "retail_cut", label: "Retail cut" },
  { value: "bundle", label: "Bundle" },
  { value: "other", label: "Other" },
];

export default async function ProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organization } = await requireOrg();
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("meat_products")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard/listings" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All listings
      </Link>
      <PageHeader
        title={product.name}
        description={product.product_type?.replace("_", " ")}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={product.status === "active" ? "success" : "secondary"}>{product.status}</Badge>
            {product.status === "active" && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/beef/${product.id}`} target="_blank">
                  Public page <ExternalLink className="size-4" />
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Product details</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm<ListingActionState> action={updateMeatProductAction} submitLabel="Save changes">
            <input type="hidden" name="id" value={product.id} />
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={product.name ?? ""} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product_type">Type</Label>
                <Select id="product_type" name="product_type" defaultValue={product.product_type ?? "retail_cut"}>
                  {types.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input id="unit" name="unit" defaultValue={product.unit ?? "each"} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price_usd">Price (USD)</Label>
                <Input id="price_usd" name="price_usd" type="number" min="0" step="0.01" defaultValue={product.price_usd ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inventory">Inventory</Label>
                <Input id="inventory" name="inventory" type="number" min="0" defaultValue={product.inventory ?? ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={4} defaultValue={product.description ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Visibility</Label>
              <Select id="status" name="status" defaultValue={product.status === "active" ? "active" : "draft"}>
                <option value="active">Published (shown in the storefront)</option>
                <option value="draft">Unpublished (hidden draft)</option>
              </Select>
            </div>
          </ActionForm>
        </CardContent>
      </Card>

      <PhotosManager entityType="product" entityId={product.id} photos={product.photos ?? []} />

      <Card className="mt-6 border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Delete product</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Permanently removes this product from your storefront. This can&apos;t be undone.
          </p>
          <form action={deleteMeatProductAction}>
            <input type="hidden" name="id" value={product.id} />
            <Button type="submit" variant="destructive" size="sm">Delete product</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
