import Link from "next/link";

import { MediaImage } from "@/modules/media/components/media-image";
import { cn } from "@/lib/utils";

/** Image-first marketplace card: photo → price → title → ranch · location.
 * The entire card is one large tap target. Used across home, marketplace,
 * beef, auctions, and storefronts. */
export function CatalogCard({
  href,
  photos,
  title,
  price,
  subtitle,
  meta,
  tag,
  soldOut,
}: {
  href: string;
  photos?: string[] | null;
  title: string;
  price: string;
  subtitle?: string;
  meta?: string;
  tag?: string;
  soldOut?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative">
        <MediaImage photos={photos} alt={title} className="rounded-none border-0" />
        {tag && (
          <span className="absolute left-2 top-2 rounded-md bg-ink/85 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-bone">
            {tag}
          </span>
        )}
        {soldOut && (
          <span className="absolute right-2 top-2 rounded-md bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground">
            Sold out
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-lg font-bold leading-none text-foreground">{price}</p>
        <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-snug">{title}</p>
        {subtitle && (
          <p className={cn("mt-1 truncate text-sm text-muted-foreground")}>{subtitle}</p>
        )}
        {meta && <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p>}
      </div>
    </Link>
  );
}

/** Responsive grid wrapper tuned for image-first cards: 2-up on phones. */
export function CatalogGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{children}</div>
  );
}
