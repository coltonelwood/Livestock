"use client";

import { useState } from "react";
import { Mountain } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Item image with a robust fallback chain: real uploaded photo → category seed
 * image → warm branded box. Plain <img> with lazy loading + async decoding +
 * responsive sizes; a fixed 4:3 box prevents layout shift. `onError` advances
 * the chain so a broken/expired URL never shows a broken image.
 */
export function MediaImage({
  photos,
  seedSrc,
  alt,
  className,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px",
}: {
  photos?: string[] | null;
  seedSrc?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
}) {
  const candidates = [
    photos && photos.length > 0 ? photos[0] : null,
    seedSrc ?? null,
  ].filter((s): s is string => !!s);

  const [idx, setIdx] = useState(0);
  const src = candidates[idx];

  if (!src) {
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
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      sizes={sizes}
      onError={() => setIdx((i) => i + 1)}
      className={cn("aspect-[4/3] w-full object-cover", className)}
    />
  );
}
