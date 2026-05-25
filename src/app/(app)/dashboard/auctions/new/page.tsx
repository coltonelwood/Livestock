import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/modules/dashboard/components/page-header";
import { ActionForm } from "@/components/action-form";
import { createAuctionAction } from "@/modules/auctions/actions";
import { requireOrg } from "@/modules/organizations/context";
import { canAccessAuctionTools } from "@/modules/billing/entitlements";
import type { AuctionActionState } from "@/modules/auctions/schema";

export const metadata: Metadata = { title: "New sale" };

export default async function NewAuctionPage() {
  await requireOrg();
  if (!(await canAccessAuctionTools())) redirect("/dashboard/auctions");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New sale" description="Set up the sale, then add lots before going live." />
      <Card>
        <CardContent className="pt-6">
          <ActionForm<AuctionActionState> action={createAuctionAction} submitLabel="Create sale">
            <div className="space-y-2">
              <Label htmlFor="title">Sale title</Label>
              <Input id="title" name="title" placeholder="Friday Night Cattle Sale" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" placeholder="County, State" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="starts_at">Starts</Label>
                <Input id="starts_at" name="starts_at" type="datetime-local" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ends_at">Ends</Label>
                <Input id="ends_at" name="ends_at" type="datetime-local" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={3} />
            </div>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
