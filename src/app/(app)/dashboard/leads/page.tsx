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
import { sourceLabel } from "@/modules/crm/util";
import { convertLeadAction, deleteLeadAction } from "@/modules/crm/actions";

export const metadata: Metadata = { title: "Leads" };

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
          description="Leads from your Lead Assistant and listing inquiries land here automatically. You can also add one by hand to start tracking a buyer."
          action={
            <Button asChild>
              <Link href="/dashboard/leads/new">Add your first lead</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {leads.map((lead) => (
            <Card key={lead.id} className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate font-medium">
                    {lead.name || lead.email || lead.phone || "Unnamed lead"}
                  </p>
                  <Badge variant="secondary" className="shrink-0">{sourceLabel(lead.source)}</Badge>
                  {lead.customer_id && <Badge variant="success" className="shrink-0">Customer</Badge>}
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
              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                <LeadStatusSelect id={lead.id} status={lead.status} />
                {!lead.customer_id && (
                  <form action={convertLeadAction}>
                    <input type="hidden" name="id" value={lead.id} />
                    <Button type="submit" variant="outline" size="sm">Convert</Button>
                  </form>
                )}
                <form action={deleteLeadAction}>
                  <input type="hidden" name="id" value={lead.id} />
                  <Button type="submit" variant="ghost" size="sm">Delete</Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
