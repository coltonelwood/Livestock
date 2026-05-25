import Link from "next/link";

import { Logo } from "@/modules/marketing/components/logo";
import { siteConfig } from "@/modules/marketing/site-config";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <Logo className="h-8 w-8 text-primary" />
        <span className="text-xl font-bold">{siteConfig.name}</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
