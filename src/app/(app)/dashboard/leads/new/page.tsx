import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/modules/dashboard/components/page-header";
import { CrmForm } from "@/modules/crm/components/crm-form";
import { createLeadAction } from "@/modules/crm/actions";

export const metadata: Metadata = { title: "Add lead" };

export default function NewLeadPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Add lead" />
      <Card>
        <CardContent className="pt-6">
          <CrmForm action={createLeadAction} submitLabel="Save lead">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" />
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
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" defaultValue="new">
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <Textarea id="summary" name="summary" rows={3} />
            </div>
          </CrmForm>
        </CardContent>
      </Card>
    </div>
  );
}
