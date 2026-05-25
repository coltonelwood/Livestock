import Link from "next/link";

import { Button } from "@/components/ui/button";

export function MarketingCTA({
  title = "Ready to run your ranch on OpenRange?",
  subtitle = "Set up your business in minutes. No credit card required to start.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <section className="border-t bg-primary text-primary-foreground">
      <div className="container flex flex-col items-center gap-6 py-16 text-center">
        <h2 className="text-3xl font-bold">{title}</h2>
        <p className="max-w-xl text-primary-foreground/80">{subtitle}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" variant="secondary">
            <Link href="/signup">Get started free</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
          >
            <Link href="/contact">Book a demo</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
