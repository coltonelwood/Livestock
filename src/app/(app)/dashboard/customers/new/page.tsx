import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/modules/dashboard/components/page-header";
import { CrmForm } from "@/modules/crm/components/crm-form";
import { createCustomerAction } from "@/modules/crm/actions";

export const metadata: Metadata = { title: "Add customer" };

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Add customer" />
      <Card>
        <CardContent className="pt-6">
          <CrmForm action={createCustomerAction} submitLabel="Save customer">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} />
            </div>
          </CrmForm>
        </CardContent>
      </Card>
    </div>
  );
}
