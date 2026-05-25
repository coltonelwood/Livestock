import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/modules/dashboard/components/page-header";
import { ListingForm } from "@/modules/listings/components/listing-form";
import { createMeatProductAction } from "@/modules/listings/actions";

export const metadata: Metadata = { title: "New meat product" };

const types = [
  { value: "quarter", label: "Quarter" },
  { value: "half", label: "Half" },
  { value: "whole", label: "Whole" },
  { value: "retail_cut", label: "Retail cut" },
  { value: "bundle", label: "Bundle" },
  { value: "other", label: "Other" },
];

export default function NewMeatProductPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New meat product" />
      <Card>
        <CardContent className="pt-6">
          <ListingForm action={createMeatProductAction}>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Grass-fed beef — half" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product_type">Type</Label>
                <Select id="product_type" name="product_type" defaultValue="retail_cut">
                  {types.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input id="unit" name="unit" defaultValue="each" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price_usd">Price (USD)</Label>
                <Input id="price_usd" name="price_usd" type="number" min="0" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inventory">Inventory</Label>
                <Input id="inventory" name="inventory" type="number" min="0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={4} />
            </div>
          </ListingForm>
        </CardContent>
      </Card>
    </div>
  );
}
