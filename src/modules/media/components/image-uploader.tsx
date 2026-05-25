"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { uploadImageAction, type MediaState } from "@/modules/media/actions";

export function ImageUploader({
  entityType,
  entityId,
}: {
  entityType: "listing" | "product";
  entityId: string;
}) {
  const [state, action, pending] = useActionState<MediaState, FormData>(
    uploadImageAction,
    {},
  );

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="entityType" value={entityType} />
      <input type="hidden" name="entityId" value={entityId} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          required
          className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium"
        />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Uploading…" : "Upload"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, or AVIF · up to 5 MB.</p>
      {state.error && <p className="text-sm text-destructive" role="alert">{state.error}</p>}
    </form>
  );
}
