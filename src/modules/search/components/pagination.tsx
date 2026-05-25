import Link from "next/link";

import { Button } from "@/components/ui/button";
import { buildQueryString, totalPages, PAGE_SIZE } from "@/modules/search/query";

/**
 * Prev/next pagination that preserves the active filters in the URL.
 * `baseParams` should contain the current filters WITHOUT `page`.
 */
export function Pagination({
  basePath,
  page,
  count,
  baseParams,
  pageSize = PAGE_SIZE,
}: {
  basePath: string;
  page: number;
  count: number;
  baseParams: Record<string, string | number | undefined>;
  pageSize?: number;
}) {
  const pages = totalPages(count, pageSize);
  if (pages <= 1) return null;

  const href = (p: number) => `${basePath}${buildQueryString({ ...baseParams, page: p })}`;
  const hasPrev = page > 1;
  const hasNext = page < pages;

  return (
    <nav className="mt-8 flex items-center justify-between" aria-label="Pagination">
      <Button asChild variant="outline" size="sm" disabled={!hasPrev}>
        {hasPrev ? <Link href={href(page - 1)}>← Previous</Link> : <span>← Previous</span>}
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {Math.min(page, pages)} of {pages}
      </span>
      <Button asChild variant="outline" size="sm" disabled={!hasNext}>
        {hasNext ? <Link href={href(page + 1)}>Next →</Link> : <span>Next →</span>}
      </Button>
    </nav>
  );
}
