import Link from "next/link";
import {
  Package,
  Target,
  Tag,
  Gavel,
  Beef,
  Users,
  MessagesSquare,
  PhoneCall,
} from "lucide-react";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/modules/organizations/context";

export const metadata: Metadata = { title: "Home" };

export default async function DashboardHome() {
  const { organization } = await requireOrg();
  const orgId = organization.id;
  const supabase = await createClient();
  const head = { count: "exact" as const, head: true };

  const [toFill, newLeads, activeListings, upcomingAuctions] = await Promise.all([
    supabase.from("orders").select("id", head).eq("organization_id", orgId).eq("status", "paid"),
    supabase.from("leads").select("id", head).eq("organization_id", orgId).eq("status", "new"),
    supabase.from("livestock_listings").select("id", head).eq("organization_id", orgId).eq("status", "active"),
    supabase.from("auctions").select("id", head).eq("organization_id", orgId).in("status", ["scheduled", "live"]),
  ]);

  const tiles = [
    { label: "Orders to fill", value: toFill.count ?? 0, href: "/dashboard/orders", icon: Package },
    { label: "New leads", value: newLeads.count ?? 0, href: "/dashboard/leads", icon: Target },
    { label: "Active listings", value: activeListings.count ?? 0, href: "/dashboard/listings", icon: Tag },
    { label: "Upcoming sales", value: upcomingAuctions.count ?? 0, href: "/dashboard/auctions", icon: Gavel },
  ];

  const actions = [
    { label: "Add cattle listing", href: "/dashboard/listings/new", icon: Tag },
    { label: "Add beef product", href: "/dashboard/listings/meat/new", icon: Beef },
    { label: "Create auction", href: "/dashboard/auctions/new", icon: Gavel },
    { label: "Add customer", href: "/dashboard/customers/new", icon: Users },
    { label: "View inquiries", href: "/dashboard/conversations", icon: MessagesSquare },
    { label: "Lead Assistant", href: "/dashboard/receptionist", icon: PhoneCall },
  ];

  return (
    <>
      <h1 className="font-display text-2xl font-bold tracking-tight">{organization.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your ranch at a glance.</p>

      {/* Status tiles — 2-up on phones, 4-up on desktop */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
          >
            <t.icon className="size-5 text-muted-foreground" />
            <p className="mt-2 text-3xl font-bold leading-none">{t.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions — big tap targets, plain language */}
      <h2 className="mb-3 mt-8 font-display text-lg font-semibold">Quick actions</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-5 text-center text-sm font-medium transition-colors hover:border-primary/40"
          >
            <a.icon className="size-6 text-primary" />
            {a.label}
          </Link>
        ))}
      </div>
    </>
  );
}
