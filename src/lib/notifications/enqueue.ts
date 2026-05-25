import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { buildEmail, type NotificationType, type TemplateData } from "@/lib/notifications/templates";
import { sendEmail } from "@/lib/notifications/provider";

/**
 * Record + attempt to send a notification. Best-effort: it NEVER throws, so a
 * notification failure can't break the action that triggered it. Every attempt
 * is persisted (sent/failed/skipped) and audit-logged.
 */
export async function enqueueNotification(opts: {
  type: NotificationType;
  to: string | null | undefined;
  organizationId?: string | null;
  data: TemplateData;
}): Promise<void> {
  if (!opts.to) return;
  try {
    const admin = createAdminClient();
    const email = buildEmail(opts.type, opts.data);

    const { data: row } = await admin
      .from("notifications")
      .insert({
        organization_id: opts.organizationId ?? null,
        type: opts.type,
        recipient_email: opts.to,
        subject: email.subject,
        status: "queued",
        payload: opts.data as Record<string, unknown>,
      })
      .select("id")
      .single();

    const result = await sendEmail(opts.to, email.subject, email.html, email.text);
    const status = result.ok ? "sent" : result.skipped ? "skipped" : "failed";

    if (row) {
      await admin
        .from("notifications")
        .update({
          status,
          error: result.error ?? null,
          sent_at: result.ok ? new Date().toISOString() : null,
        })
        .eq("id", row.id);
    }

    await admin.from("audit_logs").insert({
      organization_id: opts.organizationId ?? null,
      action: `notification.${status}`,
      entity_type: "notification",
      metadata: { type: opts.type },
    });
  } catch {
    // Swallow — notifications must never break the triggering flow.
  }
}
