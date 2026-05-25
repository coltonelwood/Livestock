import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InquiryForm } from "@/modules/listings/components/inquiry-form";
import { ChatWidget } from "@/modules/receptionist/components/chat-widget";
import { addToCartAction } from "@/modules/commerce/actions";
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
    .from("meat_products")
    .select("name")
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();
  return { title: data?.name ?? "Beef product" };
}

export default async function BeefDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("meat_products")
    .select("*")
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();

  if (!product) notFound();

  return (
    <div className="container max-w-4xl py-12">
      <Link
        href="/beef"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All beef
      </Link>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <MediaImage photos={product.photos} alt={product.name} className="mb-5" />
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
            <Badge variant="outline">{product.product_type.replace("_", " ")}</Badge>
          </div>
          <p className="mt-2 text-2xl font-semibold text-primary">
            {product.price_usd == null
              ? "Contact for price"
              : `$${product.price_usd.toLocaleString()} / ${product.unit}`}
          </p>
          {product.seller_name && (
            <p className="mt-2 text-sm text-muted-foreground">
              Sold by {product.seller_name}
            </p>
          )}
          {product.description && (
            <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        <div className="space-y-6">
          {product.price_usd != null && (
            <Card>
              <CardHeader>
                <CardTitle>Buy direct</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {product.inventory != null && product.inventory <= 0 ? (
                  <p className="font-medium text-destructive">Sold out</p>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-primary">
                      ${product.price_usd.toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}/ {product.unit}
                      </span>
                    </p>
                    {product.inventory != null && product.inventory <= 5 && (
                      <p className="text-sm text-amber-600">
                        Only {product.inventory} left
                      </p>
                    )}
                    <form action={addToCartAction} className="flex items-end gap-2">
                      <input type="hidden" name="productId" value={product.id} />
                      <div className="space-y-1">
                        <Label htmlFor="quantity" className="text-xs">Qty</Label>
                        <Input
                          id="quantity"
                          name="quantity"
                          type="number"
                          min="1"
                          max={product.inventory ?? 99}
                          defaultValue="1"
                          className="h-10 w-20"
                        />
                      </div>
                      <Button type="submit" className="flex-1">Add to cart</Button>
                    </form>
                  </>
                )}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Ask a question</CardTitle>
            </CardHeader>
            <CardContent>
              <InquiryForm listingType="meat" listingId={product.id} />
            </CardContent>
          </Card>
          <ChatWidget
            organizationId={product.organization_id}
            businessName={product.seller_name ?? "this ranch"}
          />
        </div>
      </div>
    </div>
  );
}
