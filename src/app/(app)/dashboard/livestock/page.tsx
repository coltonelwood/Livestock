import Link from "next/link";
import { Plus } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/modules/dashboard/components/page-header";
import { EmptyState } from "@/modules/dashboard/components/empty-state";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/modules/organizations/context";

export const metadata: Metadata = { title: "Livestock" };

export default async function LivestockPage() {
  const { organization } = await requireOrg();
  const supabase = await createClient();
  const { data: animals } = await supabase
    .from("livestock")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Livestock"
        description="Animal records for your herd."
        action={
          <Button asChild>
            <Link href="/dashboard/livestock/new">
              <Plus className="size-4" /> Add animal
            </Link>
          </Button>
        }
      />

      {!animals || animals.length === 0 ? (
        <EmptyState
          title="No animals recorded"
          description="Track tags, breeds, weights, and birth dates for your livestock."
          action={
            <Button asChild>
              <Link href="/dashboard/livestock/new">Add your first animal</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {animals.map((a) => (
            <Card key={a.id} className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{a.name || a.tag || "Untagged"}</p>
                <Badge variant="outline">{a.species}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {a.tag && <p>Tag: {a.tag}</p>}
                {a.breed && <p>Breed: {a.breed}</p>}
                {a.weight_lbs != null && <p>{a.weight_lbs} lbs</p>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
