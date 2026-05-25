import "server-only";

/**
 * Email provider abstraction. Uses Resend when RESEND_API_KEY is set; otherwise
 * returns `skipped` so notifications are recorded but never block a flow when
 * email isn't configured. Swap in Postmark by editing only this file.
 */

export type SendResult = { ok: boolean; skipped?: boolean; error?: string };

export function notificationsConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true };

  const from = process.env.NOTIFICATIONS_FROM ?? "OpenRange <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html, text }),
    });
    if (!res.ok) return { ok: false, error: `provider ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "send error" };
  }
}
