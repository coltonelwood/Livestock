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

export const metadata: Metadata = { title: "Edit product" };

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
        description={product.product_type.replace("_", " ")}
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
      <PhotosManager entityType="product" entityId={product.id} photos={product.photos ?? []} />
    </div>
  );
}
