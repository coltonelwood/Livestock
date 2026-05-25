import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/modules/dashboard/components/page-header";
import { CrmForm } from "@/modules/crm/components/crm-form";
import { createLivestockAction } from "@/modules/crm/actions";

export const metadata: Metadata = { title: "Add animal" };

const species = ["cattle", "sheep", "goat", "horse", "swine", "poultry", "other"];

export default function NewLivestockPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Add animal" />
      <Card>
        <CardContent className="pt-6">
          <CrmForm action={createLivestockAction} submitLabel="Save animal">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tag">Tag / ID</Label>
                <Input id="tag" name="tag" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="species">Species</Label>
                <Select id="species" name="species" defaultValue="cattle">
                  {species.map((s) => (
                    <option key={s} value={s}>
                      {s[0].toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="breed">Breed</Label>
                <Input id="breed" name="breed" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="sex">Sex</Label>
                <Input id="sex" name="sex" placeholder="Bull, cow…" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birth_date">Birth date</Label>
                <Input id="birth_date" name="birth_date" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight_lbs">Weight (lbs)</Label>
                <Input id="weight_lbs" name="weight_lbs" type="number" min="0" step="1" />
              </div>
            </div>
          </CrmForm>
        </CardContent>
      </Card>
    </div>
  );
}
