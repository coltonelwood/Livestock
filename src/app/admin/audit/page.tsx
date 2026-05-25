import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin · Audit log" };

export default async function AdminAuditPage() {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Audit log</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Security-relevant events: orders, bids, billing, and moderation actions.
      </p>
      <div className="grid gap-2">
        {(logs ?? []).map((l) => (
          <Card key={l.id} className="flex items-center justify-between gap-4 p-3 text-sm">
            <div className="min-w-0">
              <Badge variant="secondary">{l.action}</Badge>
              <span className="ml-2 text-muted-foreground">
                {l.entity_type ?? ""}{l.entity_id ? ` ${l.entity_id.slice(0, 8)}` : ""}
              </span>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {new Date(l.created_at).toLocaleString()}
            </span>
          </Card>
        ))}
        {(!logs || logs.length === 0) && (
          <p className="text-sm text-muted-foreground">No audit events yet.</p>
        )}
      </div>
    </>
  );
}
