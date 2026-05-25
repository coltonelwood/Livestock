import Link from "next/link";

import { Button } from "@/components/ui/button";

export function FeatureHero({
  eyebrow,
  title,
  subtitle,
  primaryCta = { label: "Get started", href: "/signup" },
  secondaryCta,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
}) {
  return (
    <section className="bg-ink text-ink-foreground">
      <div className="container py-16 md:py-24">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-foreground/70">{subtitle}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href={primaryCta.href}>{primaryCta.label}</Link>
          </Button>
          {secondaryCta && (
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-ink-foreground/25 bg-transparent text-ink-foreground hover:bg-ink-foreground/10"
            >
              <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
