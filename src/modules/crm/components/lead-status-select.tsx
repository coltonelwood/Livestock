"use client";

import { useRef } from "react";

import { Select } from "@/components/ui/select";
import { updateLeadStatusAction } from "@/modules/crm/actions";
import type { LeadStatus } from "@/lib/db/types";

const STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "won", "lost"];

export function LeadStatusSelect({
  id,
  status,
}: {
  id: string;
  status: LeadStatus;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form action={updateLeadStatusAction} ref={formRef}>
      <input type="hidden" name="id" value={id} />
      <Select
        name="status"
        defaultValue={status}
        aria-label="Lead status"
        className="h-9 w-36"
        onChange={() => formRef.current?.requestSubmit()}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s[0].toUpperCase() + s.slice(1)}
          </option>
        ))}
      </Select>
    </form>
  );
}
