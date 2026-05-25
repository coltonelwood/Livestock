import Link from "next/link";

import { siteConfig } from "@/modules/marketing/site-config";
import { Logo } from "@/modules/marketing/components/logo";

const columns = [
  {
    heading: "Platform",
    links: [
      { title: "Livestock Marketplace", href: "/listings" },
      { title: "Beef Direct", href: "/beef" },
      { title: "Auctions", href: "/auctions" },
      { title: "Lead Assistant", href: "/receptionist" },
      { title: "Ranch CRM", href: "/crm" },
    ],
  },
  {
    heading: "Company",
    links: [
      { title: "About", href: "/about" },
      { title: "Pricing", href: "/pricing" },
      { title: "How it works", href: "/how-it-works" },
      { title: "Contact / Request a demo", href: "/contact" },
    ],
  },
  {
    heading: "Get started",
    links: [
      { title: "Create an account", href: "/signup" },
      { title: "Log in", href: "/login" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="bg-ink text-ink-foreground">
      <div className="container grid gap-10 py-14 md:grid-cols-4">
        <div className="space-y-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="h-7 w-7 text-bone" />
            <span className="font-display text-lg font-bold">{siteConfig.name}</span>
          </Link>
          <p className="max-w-xs text-sm text-ink-foreground/60">
            {siteConfig.tagline}
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.heading}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink-foreground/50">
              {col.heading}
            </h3>
            <ul className="space-y-2.5 text-sm text-ink-foreground/75">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-bone">
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 py-6">
        <p className="container text-center text-xs text-ink-foreground/50">
          © {new Date().getFullYear()} {siteConfig.name}. Built for people who
          work for a living.
        </p>
      </div>
    </footer>
  );
}
