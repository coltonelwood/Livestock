"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createOrganizationAction } from "@/modules/organizations/actions";
import type { OrgActionState } from "@/modules/organizations/schema";
import { businessTypes } from "@/modules/marketing/site-config";

export function CreateOrgForm() {
  const [state, action, pending] = useActionState<OrgActionState, FormData>(
    createOrganizationAction,
    {},
  );

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Business name</Label>
        <Input id="name" name="name" placeholder="e.g. Cross Creek Cattle Co." required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="businessType">Business type</Label>
        <Select id="businessType" name="businessType" defaultValue="ranch" required>
          {businessTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location (optional)</Label>
        <Input id="location" name="location" placeholder="County, State" />
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create organization"}
      </Button>
    </form>
  );
}
