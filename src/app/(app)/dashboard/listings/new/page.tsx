import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/modules/dashboard/components/page-header";
import { ListingForm } from "@/modules/listings/components/listing-form";
import { createListingAction } from "@/modules/listings/actions";

export const metadata: Metadata = { title: "New livestock listing" };

const species = ["cattle", "sheep", "goat", "horse", "swine", "poultry", "other"];

export default function NewListingPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New livestock listing" />
      <Card>
        <CardContent className="pt-6">
          <ListingForm action={createListingAction}>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" placeholder="Reg. Angus bred heifers" required />
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
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" name="quantity" type="number" min="1" defaultValue="1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_usd">Price (USD)</Label>
                <Input id="price_usd" name="price_usd" type="number" min="0" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" placeholder="County, State" />
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
