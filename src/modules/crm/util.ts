import type { LeadSource } from "@/lib/db/types";

/** Human label for where a lead came from. */
export function sourceLabel(source: LeadSource): string {
  const map: Record<LeadSource, string> = {
    web_chat: "Lead Assistant",
    listing_inquiry: "Listing inquiry",
    auction: "Auction",
    order: "DTC order",
    manual: "Manual",
    import: "Import",
  };
  return map[source] ?? source;
}

export type ReminderBucket = "done" | "overdue" | "today" | "upcoming";

/** Classify a reminder by due date for the "due" view. */
export function bucketReminder(
  dueAt: string,
  status: string,
  nowMs: number = Date.now(),
): ReminderBucket {
  if (status === "done" || status === "cancelled") return "done";
  const due = new Date(dueAt).getTime();
  if (!Number.isFinite(due)) return "upcoming";
  if (due < nowMs) {
    // Same calendar day but earlier time still counts as today, not overdue.
    const startOfToday = new Date(nowMs);
    startOfToday.setHours(0, 0, 0, 0);
    if (due >= startOfToday.getTime()) return "today";
    return "overdue";
  }
  const endOfToday = new Date(nowMs);
  endOfToday.setHours(23, 59, 59, 999);
  return due <= endOfToday.getTime() ? "today" : "upcoming";
}
