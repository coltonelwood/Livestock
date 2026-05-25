import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin · Conversations" };

export default async function AdminConversationsPage() {
  const supabase = await createClient();
  const { data: convos } = await supabase
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">AI conversations</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Receptionist conversations across all organizations, for review.
      </p>
      <div className="grid gap-2">
        {(convos ?? []).map((c) => (
          <Card key={c.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-medium">
                {c.visitor_name || c.visitor_contact || "Website visitor"}
              </p>
              <p className="text-sm text-muted-foreground">
                {new Date(c.updated_at).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {c.lead_id && <Badge variant="success">Lead</Badge>}
              <Badge variant="secondary">{c.channel.replace("_", " ")}</Badge>
            </div>
          </Card>
        ))}
        {(!convos || convos.length === 0) && (
          <p className="text-sm text-muted-foreground">No conversations yet.</p>
        )}
      </div>
    </>
  );
}
