import Link from "next/link";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/modules/dashboard/components/page-header";
import { EmptyState } from "@/modules/dashboard/components/empty-state";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/modules/organizations/context";

export const metadata: Metadata = { title: "Conversations" };

export default async function ConversationsPage() {
  const { organization } = await requireOrg();
  const supabase = await createClient();
  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .eq("organization_id", organization.id)
    .order("updated_at", { ascending: false })
    .limit(100);

  return (
    <>
      <PageHeader
        title="Conversations"
        description="Chats handled by your AI receptionist."
      />

      {!conversations || conversations.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          description="When visitors chat with your AI receptionist on your storefront or listings, those conversations show up here. Set up your receptionist to start capturing them."
          action={
            <Button asChild>
              <Link href="/dashboard/receptionist">Set up receptionist</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {conversations.map((c) => (
            <Link key={c.id} href={`/dashboard/conversations/${c.id}`}>
              <Card className="flex items-center justify-between p-4 transition-colors hover:border-primary/40">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {c.visitor_name || c.visitor_contact || "Website visitor"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(c.updated_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {c.lead_id && <Badge variant="success">Lead</Badge>}
                  <Badge variant="secondary">{c.channel.replace("_", " ")}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
