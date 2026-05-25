"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, Beef, Gavel, Tag, User } from "lucide-react";

import { cn } from "@/lib/utils";

const tabs = [
  { label: "Market", href: "/listings", icon: Store, match: (p: string) => p === "/listings" || p.startsWith("/listings/") },
  { label: "Beef", href: "/beef", icon: Beef, match: (p: string) => p === "/beef" || p.startsWith("/beef/") },
  { label: "Auctions", href: "/auctions", icon: Gavel, match: (p: string) => p === "/auctions" || p.startsWith("/auctions/") },
  { label: "Sell", href: "/signup", icon: Tag, match: (p: string) => p === "/signup" },
  { label: "Account", href: "/orders", icon: User, match: (p: string) => p === "/orders" || p === "/bids" || p === "/login" },
];

/** Thumb-friendly mobile bottom tab bar (hidden on md+). */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bone/95 backdrop-blur md:hidden">
      <ul className="grid grid-cols-5">
        {tabs.map((t) => {
          const active = t.match(pathname);
          return (
            <li key={t.label}>
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
      </ul>
    </nav>
  );
}
