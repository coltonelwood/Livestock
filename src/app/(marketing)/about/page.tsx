import type { Metadata } from "next";

import { Section, SectionHeading } from "@/modules/marketing/components/section";
import { FeatureHero } from "@/modules/marketing/components/feature-hero";
import { MarketingCTA } from "@/modules/marketing/components/cta";

export const metadata: Metadata = {
  title: "About OpenRange",
  description:
    "Why OpenRange exists: one honest platform for the business side of ranching and livestock commerce.",
};

const principles = [
  { title: "Built for the work, not the demo", body: "Plain language, big tap targets, and screens that load on a truck with one bar of signal. If it doesn't help you sell stock or save time, it doesn't ship." },
  { title: "Your data is yours", body: "Records are scoped to your operation and isolated at the database level. We don't sell your customer list, and there's no long-term contract." },
  { title: "Honest about what's real", body: "We don't dress up roadmap features as finished ones. Where something's still in development, we say so." },
];

export default function AboutPage() {
  return (
    <>
      <FeatureHero
        eyebrow="About"
        title="The business of ranching deserves better tools"
        subtitle="One platform to sell stock and beef — and keep track of your buyers."
        primaryCta={{ label: "Get started", href: "/signup" }}
        secondaryCta={{ label: "Request a demo", href: "/contact" }}
      />

      <Section>
        <SectionHeading eyebrow="Why it exists" title="Ranchers run on phone calls, paper, and Facebook groups" />
        <div className="mt-6 max-w-3xl space-y-4 text-lg leading-relaxed text-muted-foreground">
          <p>
            A buyer texts about heifers while you&apos;re fixing fence. A half-beef
            order gets lost in a thread. The sale barn calls and you miss it.
            The tools that run the rest of modern business never showed up for
            agriculture — so the business side of the ranch still lives in a
            notebook and a dozen apps that don&apos;t talk to each other.
          </p>
          <p>
            OpenRange brings the marketplace, the storefront, the auctions, and
            the customer book into one place — with a lead assistant that
            catches the inquiries you can&apos;t. It&apos;s built mobile-first,
            for people who are usually outside and rarely at a desk.
          </p>
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeading eyebrow="How we build" title="A few things we hold to" />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {principles.map((p) => (
            <div key={p.title} className="rounded-lg border border-border bg-background p-6">
              <h3 className="font-display text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <MarketingCTA
        title="Put your operation on OpenRange"
        subtitle="Free to start. Talk to us any time."
      />
    </>
  );
}
