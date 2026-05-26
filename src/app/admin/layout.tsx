import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { requirePlatformAdmin } from "@/lib/auth/session";

const adminNav = [
  { title: "Overview", href: "/admin" },
  { title: "Agents", href: "/admin/agents" },
  { title: "Organizations", href: "/admin/organizations" },
  { title: "Users", href: "/admin/users" },
  { title: "Listings", href: "/admin/listings" },
  { title: "Products", href: "/admin/products" },
  { title: "Auctions", href: "/admin/auctions" },
  { title: "Conversations", href: "/admin/conversations" },
  { title: "Audit log", href: "/admin/audit" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePlatformAdmin();

  return (
    <div className="min-h-screen">
      <header className="border-b bg-foreground text-background">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2 font-bold">
              <ShieldCheck className="size-5" /> OpenRange Admin
            </Link>
            <nav className="hidden gap-4 text-sm lg:flex">
              {adminNav.map((i) => (
                <Link key={i.href} href={i.href} className="opacity-80 hover:opacity-100">
                  {i.title}
                </Link>
              ))}
            </nav>
          </div>
          <Link href="/dashboard" className="text-sm opacity-80 hover:opacity-100">
            ← Back to app
          </Link>
        </div>
      </header>
      <div className="border-b bg-foreground/90 p-2 text-background lg:hidden">
        <nav className="container flex gap-4 overflow-x-auto text-sm">
          {adminNav.map((i) => (
            <Link key={i.href} href={i.href} className="shrink-0 opacity-80">
              {i.title}
            </Link>
          ))}
        </nav>
      </div>
      <main className="container py-8">{children}</main>
    </div>
  );
}
