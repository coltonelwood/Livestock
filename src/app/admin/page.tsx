import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin · Overview" };

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const head = { count: "exact" as const, head: true };

  const [users, orgs, listings, leads, contacts] = await Promise.all([
    supabase.from("profiles").select("id", head),
    supabase.from("organizations").select("id", head),
    supabase.from("livestock_listings").select("id", head),
    supabase.from("leads").select("id", head),
    supabase.from("contact_requests").select("id", head),
  ]);

  const stats = [
    { label: "Users", value: users.count ?? 0 },
    { label: "Organizations", value: orgs.count ?? 0 },
    { label: "Livestock listings", value: listings.count ?? 0 },
    { label: "Leads", value: leads.count ?? 0 },
    { label: "Demo requests", value: contacts.count ?? 0 },
  ];

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Platform overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
