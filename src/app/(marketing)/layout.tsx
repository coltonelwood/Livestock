import { SiteHeader } from "@/modules/marketing/components/site-header";
import { SiteFooter } from "@/modules/marketing/components/site-footer";
import { BottomNav } from "@/modules/marketing/components/bottom-nav";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      {/* pb-16 on mobile keeps content clear of the fixed bottom nav. */}
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
