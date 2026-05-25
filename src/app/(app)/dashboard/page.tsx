import Link from "next/link";
import { Target, Users, Tag, MessagesSquare } from "lucide-react";
import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/modules/dashboard/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/modules/organizations/context";

export const metadata: Metadata = { title: "Overview" };

export default async function DashboardPage() {
  const { organization } = await requireOrg();
  const orgId = organization.id;
  const supabase = await createClient();

  const head = { count: "exact" as const, head: true };
  const [leads, customers, listings, conversations] = await Promise.all([
    supabase
      .from("leads")
      .select("id", head)
      .eq("organization_id", orgId)
      .neq("status", "lost"),
    supabase.from("customers").select("id", head).eq("organization_id", orgId),
    supabase
      .from("livestock_listings")
      .select("id", head)
      .eq("organization_id", orgId)
      .eq("status", "active"),
    supabase
      .from("conversations")
      .select("id", head)
      .eq("organization_id", orgId)
      .eq("status", "open"),
  ]);

  const stats = [
    { label: "Open leads", value: leads.count ?? 0, icon: Target, href: "/dashboard/leads" },
    { label: "Customers", value: customers.count ?? 0, icon: Users, href: "/dashboard/customers" },
    { label: "Active listings", value: listings.count ?? 0, icon: Tag, href: "/dashboard/listings" },
    { label: "Open conversations", value: conversations.count ?? 0, icon: MessagesSquare, href: "/dashboard/conversations" },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome, ${organization.name}`}
        description="Here's what's happening across your operation."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-colors hover:border-primary/40">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {s.label}
                </CardTitle>
                <s.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Get set up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Link href="/dashboard/receptionist" className="block text-primary hover:underline">
              → Configure your AI receptionist
            </Link>
            <Link href="/dashboard/listings/new" className="block text-primary hover:underline">
              → Create your first listing
            </Link>
            <Link href="/dashboard/customers" className="block text-primary hover:underline">
              → Add a customer
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Coming soon</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Live auctions, transport load board, and integrated payments are on
            the roadmap. Your data model is already prepared for them.
          </CardContent>
        </Card>
      </div>
    </>
  );
}
