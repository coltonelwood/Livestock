import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/modules/dashboard/components/page-header";
import { CrmForm } from "@/modules/crm/components/crm-form";
import { addNoteAction } from "@/modules/crm/actions";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/modules/organizations/context";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organization } = await requireOrg();
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("id", id)
    .maybeSingle();

  if (!customer) notFound();

  const { data: notes } = await supabase
    .from("notes")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("entity_type", "customer")
    .eq("entity_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/dashboard/customers"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to customers
      </Link>

      <PageHeader title={customer.name} />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Email:</span> {customer.email ?? "—"}</p>
            <p><span className="text-muted-foreground">Phone:</span> {customer.phone ?? "—"}</p>
            <p><span className="text-muted-foreground">Address:</span> {customer.address ?? "—"}</p>
            {customer.notes && (
              <p className="pt-2 text-muted-foreground">{customer.notes}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CrmForm action={addNoteAction} submitLabel="Add note">
              <input type="hidden" name="entity_type" value="customer" />
              <input type="hidden" name="entity_id" value={id} />
              <div className="space-y-2">
                <Label htmlFor="body" className="sr-only">Note</Label>
                <Textarea id="body" name="body" rows={2} placeholder="Add a note…" />
              </div>
            </CrmForm>

            <ul className="space-y-3">
              {(notes ?? []).map((n) => (
                <li key={n.id} className="rounded-md border bg-muted/30 p-3 text-sm">
                  <p className="whitespace-pre-wrap">{n.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
              {(!notes || notes.length === 0) && (
                <li className="text-sm text-muted-foreground">No notes yet.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
