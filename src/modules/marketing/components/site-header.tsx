import Link from "next/link";
import { Menu, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { siteConfig } from "@/modules/marketing/site-config";
import { Logo } from "@/modules/marketing/components/logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-bone/95 backdrop-blur supports-[backdrop-filter]:bg-bone/80">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo className="h-8 w-8 text-primary" />
          <span className="font-display text-xl font-bold tracking-tight">
            {siteConfig.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {siteConfig.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
            >
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <Button asChild variant="ghost" size="icon" aria-label="Cart">
            <Link href="/cart">
              <ShoppingCart className="size-5" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>

        {/* Mobile menu — CSS-only disclosure, no client JS. */}
        <details className="group relative lg:hidden">
          <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-md border border-border [&::-webkit-details-marker]:hidden">
            <Menu className="size-5" />
            <span className="sr-only">Menu</span>
          </summary>
          <div className="absolute right-0 top-12 w-60 rounded-lg border border-border bg-bone p-2 shadow-lg">
            <nav className="flex flex-col">
              {siteConfig.nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary"
                >
                  {item.title}
                </Link>
              ))}
              <div className="rule my-2" />
              <Link
                href="/cart"
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
              >
                Cart
              </Link>
              <Link
                href="/orders"
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
              >
                My orders
              </Link>
              <Link
                href="/login"
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
              >
                Log in
              </Link>
              <Button asChild className="mt-1">
                <Link href="/signup">Get started</Link>
              </Button>
            </nav>
          </div>
        </details>
      </div>
    </header>
  );
}
