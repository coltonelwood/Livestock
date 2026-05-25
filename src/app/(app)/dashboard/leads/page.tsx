import Link from "next/link";
import { Plus } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/modules/dashboard/components/page-header";
import { EmptyState } from "@/modules/dashboard/components/empty-state";
import { LeadStatusSelect } from "@/modules/crm/components/lead-status-select";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/modules/organizations/context";
import type { LeadSource } from "@/lib/db/types";

export const metadata: Metadata = { title: "Leads" };

const sourceLabel: Record<LeadSource, string> = {
  web_chat: "Web chat",
  listing_inquiry: "Listing",
  manual: "Manual",
  import: "Import",
};

export default async function LeadsPage() {
  const { organization } = await requireOrg();
  const supabase = await createClient();
  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Leads"
        description="Inquiries from chat, listings, and your team — track them to close."
        action={
          <Button asChild>
            <Link href="/dashboard/leads/new">
              <Plus className="size-4" /> Add lead
            </Link>
          </Button>
        }
      />

      {!leads || leads.length === 0 ? (
        <EmptyState
          title="No leads yet"
          description="Leads from your AI receptionist and listing inquiries will show up here automatically."
        />
      ) : (
        <div className="grid gap-3">
          {leads.map((lead) => (
            <Card key={lead.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">
                    {lead.name || lead.email || lead.phone || "Unnamed lead"}
                  </p>
                  <Badge variant="secondary">{sourceLabel[lead.source]}</Badge>
                </div>
                {lead.summary && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {lead.summary}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {[lead.email, lead.phone].filter(Boolean).join(" · ")}
                </p>
              </div>
              <LeadStatusSelect id={lead.id} status={lead.status} />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
