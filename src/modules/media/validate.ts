/**
 * Pure media validation — no I/O, fully unit-testable. Used by the upload
 * action before anything touches Storage.
 */

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_IMAGES_PER_ITEM = 8;

export type ValidationResult = { ok: true } | { ok: false; error: string };

export function validateImageFile(file: { type: string; size: number }): ValidationResult {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return { ok: false, error: "Only JPEG, PNG, WebP, or AVIF images are allowed." };
  }
  if (file.size <= 0) return { ok: false, error: "Empty file." };
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Images must be 5 MB or smaller." };
  }
  return { ok: true };
}

/** Derive a safe storage object name: strip path, slug the base, keep extension. */
export function safeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "image";
  const dot = base.lastIndexOf(".");
  const stem = (dot > 0 ? base.slice(0, dot) : base)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "image";
  const ext = (dot > 0 ? base.slice(dot + 1) : "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 5);
  const suffix = Math.random().toString(36).slice(2, 8);
  return ext ? `${stem}-${suffix}.${ext}` : `${stem}-${suffix}`;
}

export function extToContentType(name: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "avif":
      return "image/avif";
    default:
      return null;
  }
}
