import { Check } from "lucide-react";

import { MarketingCTA } from "@/modules/marketing/components/cta";

export type Audience = {
  eyebrow: string;
  title: string;
  subtitle: string;
  benefits: { title: string; body: string }[];
};

export function AudiencePage({ audience }: { audience: Audience }) {
  return (
    <>
      <section className="container py-16 text-center md:py-24">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          {audience.eyebrow}
        </p>
        <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
          {audience.title}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          {audience.subtitle}
        </p>
      </section>

      <section className="container grid gap-6 pb-20 md:grid-cols-2">
        {audience.benefits.map((b) => (
          <div key={b.title} className="flex gap-4 rounded-lg border p-6">
            <Check className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <h3 className="font-semibold">{b.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{b.body}</p>
            </div>
          </div>
        ))}
      </section>

      <MarketingCTA />
    </>
  );
}
