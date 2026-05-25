import { describe, expect, it } from "vitest";

import {
  validateImageFile,
  safeFilename,
  extToContentType,
  MAX_IMAGE_BYTES,
} from "@/modules/media/validate";

describe("validateImageFile", () => {
  it("accepts an allowed image under the size limit", () => {
    expect(validateImageFile({ type: "image/jpeg", size: 1000 })).toEqual({ ok: true });
    expect(validateImageFile({ type: "image/webp", size: 1000 }).ok).toBe(true);
  });

  it("rejects a disallowed type (e.g. svg / pdf / script)", () => {
    expect(validateImageFile({ type: "image/svg+xml", size: 100 }).ok).toBe(false);
    expect(validateImageFile({ type: "application/pdf", size: 100 }).ok).toBe(false);
  });

  it("rejects empty and oversized files", () => {
    expect(validateImageFile({ type: "image/png", size: 0 }).ok).toBe(false);
    expect(validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES + 1 }).ok).toBe(false);
  });
});

describe("safeFilename", () => {
  it("strips path traversal and unsafe chars, keeps extension", () => {
    const out = safeFilename("../../etc/Pass Word!.JPG");
    expect(out).toMatch(/^pass-word-[a-z0-9]{6}\.jpg$/);
    expect(out).not.toContain("/");
    expect(out).not.toContain("..");
  });

  it("handles missing extension", () => {
    expect(safeFilename("photo")).toMatch(/^photo-[a-z0-9]{6}$/);
  });
});

describe("extToContentType", () => {
  it("maps known extensions and rejects unknown", () => {
    expect(extToContentType("a.jpg")).toBe("image/jpeg");
    expect(extToContentType("a.webp")).toBe("image/webp");
    expect(extToContentType("a.exe")).toBeNull();
  });
});
