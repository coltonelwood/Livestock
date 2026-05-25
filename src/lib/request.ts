/**
 * Best-effort client IP from proxy headers (Vercel sets x-forwarded-for).
 * Falls back to a stable sentinel so rate-limit keys are never empty.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
