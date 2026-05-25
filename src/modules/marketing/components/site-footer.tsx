import Link from "next/link";

import { siteConfig } from "@/modules/marketing/site-config";
import { Logo } from "@/modules/marketing/components/logo";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container grid gap-8 py-12 md:grid-cols-4">
        <div className="space-y-3">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-6 w-6 text-primary" />
            <span className="font-bold">{siteConfig.name}</span>
          </Link>
          <p className="text-sm text-muted-foreground">{siteConfig.tagline}</p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">Platform</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {siteConfig.nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-foreground">
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">Company</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/contact" className="hover:text-foreground">
                Contact / Book a demo
              </Link>
            </li>
            <li>
              <Link href="/beef" className="hover:text-foreground">
                Buy beef direct
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">Get started</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/signup" className="hover:text-foreground">
                Create an account
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-foreground">
                Log in
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t py-6">
        <p className="container text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
