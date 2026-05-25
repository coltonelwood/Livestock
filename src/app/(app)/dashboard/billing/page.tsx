import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/modules/dashboard/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/modules/organizations/context";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  const { organization } = await requireOrg();
  const supabase = await createClient();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("organization_id", organization.id)
    .maybeSingle();

  const plan = subscription?.plan ?? "free";
  const status = subscription?.status ?? "trialing";

  return (
    <>
      <PageHeader title="Billing" description="Manage your plan and payment method." />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Current plan</span>
            <Badge variant="secondary">{status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-2xl font-bold capitalize">{plan}</p>
          <div className="rounded-md border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
            Payments are not yet enabled in this preview. Stripe billing is on the
            roadmap — the subscription model and webhooks are already scaffolded.
          </div>
          <Button asChild variant="outline">
            <Link href="/pricing">View plans</Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
