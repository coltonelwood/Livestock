import Link from "next/link";
import { Plus } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/modules/dashboard/components/page-header";
import { EmptyState } from "@/modules/dashboard/components/empty-state";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/modules/organizations/context";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage() {
  const { organization } = await requireOrg();
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Customers"
        description="Everyone you do business with."
        action={
          <Button asChild>
            <Link href="/dashboard/customers/new">
              <Plus className="size-4" /> Add customer
            </Link>
          </Button>
        }
      />

      {!customers || customers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          description="Add your buyers, sellers, and contacts to keep everything in one place."
          action={
            <Button asChild>
              <Link href="/dashboard/customers/new">Add your first customer</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {customers.map((c) => (
            <Link key={c.id} href={`/dashboard/customers/${c.id}`}>
              <Card className="flex items-center justify-between p-4 transition-colors hover:border-primary/40">
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {[c.email, c.phone].filter(Boolean).join(" · ") || "No contact info"}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
