"use client";

import { useRef } from "react";

import { Select } from "@/components/ui/select";
import { switchOrganizationAction } from "@/modules/organizations/actions";
import type { Membership } from "@/modules/organizations/context";

export function OrgSwitcher({
  memberships,
  currentId,
}: {
  memberships: Membership[];
  currentId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  if (memberships.length <= 1) {
    return (
      <div className="truncate text-sm font-semibold" title={memberships[0]?.organization.name}>
        {memberships[0]?.organization.name}
      </div>
    );
  }

  return (
    <form action={switchOrganizationAction} ref={formRef}>
      <Select
        name="organizationId"
        defaultValue={currentId}
        aria-label="Switch organization"
        onChange={() => formRef.current?.requestSubmit()}
      >
        {memberships.map((m) => (
          <option key={m.organization.id} value={m.organization.id}>
            {m.organization.name}
          </option>
        ))}
      </Select>
    </form>
  );
}
