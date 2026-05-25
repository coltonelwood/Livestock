import { Mountain } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Item image with a warm, intentional fallback (not a sterile box). Plain <img>
 * with lazy loading + async decoding + responsive sizes so cards stay fast on
 * mobile data. Fixed 4:3 box prevents layout shift.
 */
export function MediaImage({
  photos,
  alt,
  className,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px",
}: {
  photos: string[] | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
}) {
  const url = photos && photos.length > 0 ? photos[0] : null;

  if (!url) {
    return (
      <div
        className={cn(
          "flex aspect-[4/3] w-full items-center justify-center bg-secondary",
          className,
        )}
        aria-hidden="true"
      >
        <Mountain className="size-9 text-muted-foreground/40" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      sizes={sizes}
      className={cn("aspect-[4/3] w-full object-cover", className)}
    />
  );
}
