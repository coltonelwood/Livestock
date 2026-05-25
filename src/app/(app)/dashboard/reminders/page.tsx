import Link from "next/link";
import { Plus, Check, Circle } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/modules/dashboard/components/page-header";
import { EmptyState } from "@/modules/dashboard/components/empty-state";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/modules/organizations/context";
import { toggleReminderAction } from "@/modules/crm/actions";
import { bucketReminder, type ReminderBucket } from "@/modules/crm/util";
import { cn } from "@/lib/utils";
import type { Reminder } from "@/lib/db/types";

export const metadata: Metadata = { title: "Reminders" };

const SECTIONS: { key: ReminderBucket; title: string; tone: string }[] = [
  { key: "overdue", title: "Overdue", tone: "text-destructive" },
  { key: "today", title: "Due today", tone: "text-accent" },
  { key: "upcoming", title: "Upcoming", tone: "text-foreground" },
  { key: "done", title: "Done", tone: "text-muted-foreground" },
];

export default async function RemindersPage() {
  const { organization } = await requireOrg();
  const supabase = await createClient();
  const { data: reminders } = await supabase
    .from("reminders")
    .select("*")
    .eq("organization_id", organization.id)
    .order("due_at", { ascending: true });

  const now = Date.now();
  const buckets: Record<ReminderBucket, Reminder[]> = {
    overdue: [], today: [], upcoming: [], done: [],
  };
  for (const r of reminders ?? []) {
    buckets[bucketReminder(r.due_at, r.status, now)].push(r);
  }

  return (
    <>
      <PageHeader
        title="Reminders"
        description="Follow-ups, vaccinations, and to-dos — grouped by when they're due."
        action={
          <Button asChild>
            <Link href="/dashboard/reminders/new">
              <Plus className="size-4" /> Add reminder
            </Link>
          </Button>
        }
      />

      {!reminders || reminders.length === 0 ? (
        <EmptyState
          title="No reminders yet"
          description="Track vaccinations, preg checks, and follow-up calls so nothing slips."
          action={
            <Button asChild>
              <Link href="/dashboard/reminders/new">Add a reminder</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {SECTIONS.map((section) => {
            const items = buckets[section.key];
            if (items.length === 0) return null;
            return (
              <div key={section.key}>
                <h2 className={cn("mb-2 text-sm font-semibold uppercase tracking-wide", section.tone)}>
                  {section.title} ({items.length})
                </h2>
                <div className="grid gap-2">
                  {items.map((r) => {
                    const done = r.status === "done";
                    return (
                      <Card key={r.id} className="flex items-center gap-3 p-3">
                        <form action={toggleReminderAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="done" value={(!done).toString()} />
                          <button
                            type="submit"
                            aria-label={done ? "Mark as not done" : "Mark as done"}
                            className={cn(
                              "flex size-6 items-center justify-center rounded-full border",
                              done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                            )}
                          >
                            {done ? <Check className="size-4" /> : <Circle className="size-3 opacity-0" />}
                          </button>
                        </form>
                        <div className="min-w-0 flex-1">
                          <p className={cn("font-medium", done && "text-muted-foreground line-through")}>
                            {r.title}
                          </p>
                          {r.body && <p className="text-sm text-muted-foreground">{r.body}</p>}
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Date(r.due_at).toLocaleDateString()}
                        </span>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
