import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/modules/dashboard/components/page-header";
import { CrmForm } from "@/modules/crm/components/crm-form";
import { createReminderAction } from "@/modules/crm/actions";

export const metadata: Metadata = { title: "Add reminder" };

export default function NewReminderPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Add reminder" />
      <Card>
        <CardContent className="pt-6">
          <CrmForm action={createReminderAction} submitLabel="Save reminder">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_at">Due</Label>
              <Input id="due_at" name="due_at" type="datetime-local" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Details</Label>
              <Textarea id="body" name="body" rows={3} />
            </div>
          </CrmForm>
        </CardContent>
      </Card>
    </div>
  );
}
