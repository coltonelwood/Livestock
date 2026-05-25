import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InquiryForm } from "@/modules/listings/components/inquiry-form";
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
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
            <Badge variant="outline">{product.product_type.replace("_", " ")}</Badge>
          </div>
          <p className="mt-2 text-2xl font-semibold text-primary">
            {product.price_usd == null
              ? "Contact for price"
              : `$${product.price_usd.toLocaleString()} / ${product.unit}`}
          </p>
          {product.description && (
            <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Order / ask a question</CardTitle>
          </CardHeader>
          <CardContent>
            <InquiryForm listingType="meat" listingId={product.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
