import { ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Renders the first photo for an item, or a tasteful fallback when there are
 * none. Plain <img> (Supabase public URLs) to avoid next/image domain config.
 */
export function MediaImage({
  photos,
  alt,
  className,
}: {
  photos: string[] | null | undefined;
  alt: string;
  className?: string;
}) {
  const url = photos && photos.length > 0 ? photos[0] : null;
  if (!url) {
    return (
      <div
        className={cn(
          "flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-dashed bg-muted/40 text-muted-foreground",
          className,
        )}
      >
        <ImageOff className="size-8 opacity-50" />
        <span className="sr-only">No photo</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className={cn("aspect-[4/3] w-full rounded-lg border object-cover", className)}
    />
  );
}
