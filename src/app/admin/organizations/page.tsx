import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin · Organizations" };

export default async function AdminOrganizationsPage() {
  const supabase = await createClient();
  const { data: orgs } = await supabase
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Organizations</h1>
      <div className="grid gap-2">
        {(orgs ?? []).map((o) => (
          <Card key={o.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{o.name}</p>
              <p className="text-sm text-muted-foreground">/{o.slug}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{o.business_type.replace("_", " ")}</Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(o.created_at).toLocaleDateString()}
              </span>
            </div>
          </Card>
        ))}
        {(!orgs || orgs.length === 0) && (
          <p className="text-sm text-muted-foreground">No organizations yet.</p>
        )}
      </div>
    </>
  );
}
