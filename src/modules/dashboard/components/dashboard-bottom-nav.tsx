"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Tag, Package, Target, Menu, X, LogOut } from "lucide-react";

import { cn } from "@/lib/utils";
import { dashboardNav } from "@/modules/dashboard/nav";
import { OrgSwitcher } from "@/modules/dashboard/components/org-switcher";
import { logoutAction } from "@/modules/auth/actions";
import type { Membership } from "@/modules/organizations/context";

const primary = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Listings", href: "/dashboard/listings", icon: Tag },
  { label: "Orders", href: "/dashboard/orders", icon: Package },
  { label: "Leads", href: "/dashboard/leads", icon: Target },
];

const primaryHrefs = new Set(primary.map((p) => p.href));

export function DashboardBottomNav({
  memberships,
  currentId,
}: {
  memberships: Membership[];
  currentId: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-border bg-bone p-4 pb-20">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-lg font-bold">Menu</span>
              <button onClick={() => setOpen(false)} className="rounded-md p-2" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <div className="mb-3">
              <OrgSwitcher memberships={memberships} currentId={currentId} />
            </div>
            <nav className="grid grid-cols-2 gap-2">
              {dashboardNav
                .filter((i) => !primaryHrefs.has(i.href))
                .map((i) => (
                  <Link
                    key={i.href}
                    href={i.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium"
                  >
                    <i.icon className="size-5 text-muted-foreground" />
                    {i.title}
                  </Link>
                ))}
            </nav>
            <form action={logoutAction} className="mt-3">
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg border border-border p-3 text-sm font-medium">
                <LogOut className="size-4" /> Log out
              </button>
            </form>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bone/95 backdrop-blur md:hidden">
        <ul className="grid grid-cols-5">
          {primary.map((t) => {
            const active = isActive(t.href, t.exact);
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <t.icon className={cn("size-6", active && "stroke-[2.5]")} />
                  {t.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => setOpen(true)}
              className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground"
            >
              <Menu className="size-6" />
              More
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
