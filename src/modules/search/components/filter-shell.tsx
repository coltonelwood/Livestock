import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/**
 * Mobile-friendly filter panel. Plain GET <form> (no client JS): fields map to
 * URL query params, the page reads them server-side. Collapsible via <details>.
 */
export function FilterShell({
  basePath,
  children,
}: {
  basePath: string;
  children: React.ReactNode;
}) {
  return (
    <form method="get" action={basePath}>
      <details
        open
        className="rounded-lg border border-border bg-card [&_summary]:list-none"
      >
        <summary className="flex cursor-pointer items-center gap-2 p-4 font-medium">
          <SlidersHorizontal className="size-4" /> Filters
        </summary>
        <div className="border-t border-border p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
          <div className="mt-4 flex gap-2">
            <Button type="submit" size="sm">Apply filters</Button>
            <Button asChild type="button" variant="ghost" size="sm">
              <Link href={basePath}>Clear</Link>
            </Button>
          </div>
        </div>
      </details>
    </form>
  );
}
