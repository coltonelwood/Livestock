import Link from "next/link";

import { Logo } from "@/modules/marketing/components/logo";
import { NavLinks } from "@/modules/dashboard/components/nav-links";
import { OrgSwitcher } from "@/modules/dashboard/components/org-switcher";
import { UserMenu } from "@/modules/dashboard/components/user-menu";
import { requireOrg, getMemberships } from "@/modules/organizations/context";
import { getProfile } from "@/lib/auth/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [current, memberships, profile] = await Promise.all([
    requireOrg(),
    getMemberships(),
    getProfile(),
  ]);

  const displayName =
    profile?.full_name || profile?.email || "Account";

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-muted/20 p-4 md:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2">
          <Logo className="h-7 w-7 text-primary" />
          <span className="font-display text-lg font-bold">OpenRange</span>
        </Link>
        <div className="mb-4 px-1">
          <OrgSwitcher
            memberships={memberships}
            currentId={current.organization.id}
          />
        </div>
        <NavLinks />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
          <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
            <Logo className="h-6 w-6 text-primary" />
            <span className="font-bold">OpenRange</span>
          </Link>
          <div className="hidden text-sm font-medium md:block">
            {current.organization.name}
          </div>
          <UserMenu name={displayName} />
        </header>

        {/* Mobile nav */}
        <div className="border-b bg-muted/20 p-2 md:hidden">
          <NavLinks />
        </div>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
