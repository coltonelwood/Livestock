import Link from "next/link";
import {
  ArrowRight,
  Store,
  Beef,
  Gavel,
  PhoneCall,
  Users,
  ShieldCheck,
  Lock,
  FileText,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Section, SectionHeading } from "@/modules/marketing/components/section";
import {
  DemoListingCard,
  BeefBoxCard,
  AuctionLotCard,
} from "@/modules/marketing/components/preview-cards";
import {
  demoCattleListings,
  demoBeefBoxes,
  demoAuctionLots,
} from "@/modules/marketing/demo-data";
import { PLANS, PURCHASABLE_PLANS } from "@/modules/billing/plans";

const audiences = [
  "Ranchers",
  "Breeders",
  "Auction houses",
  "Haulers",
  "Direct-to-consumer beef",
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-ink text-ink-foreground">
        <div className="container py-20 md:py-28">
          <p className="eyebrow">Built for people who work the land</p>
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            The operating system for modern livestock commerce
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-foreground/70 md:text-xl">
            One platform for ranchers, breeders, auction houses, haulers, and
            direct-to-consumer beef sellers — to list and sell stock, run the
            books on your customers, and answer the calls you can&apos;t always
            get to.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">
                Start your operation <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-ink-foreground/25 bg-transparent text-ink-foreground hover:bg-ink-foreground/10"
            >
              <Link href="/listings">Browse the marketplace</Link>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-6 text-sm text-ink-foreground/60">
            {audiences.map((a) => (
              <span key={a} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-accent" /> {a}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Marketplace preview */}
      <Section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Livestock Marketplace"
            title="List your stock where buyers are looking"
            description="Post cattle, genetics, and breeding stock with photos, weights, and pricing. Every listing has its own public page and an inquiry form that drops straight into your CRM."
          />
          <Button asChild variant="outline">
            <Link href="/listings">
              Browse listings <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {demoCattleListings.map((l) => (
            <DemoListingCard key={l.id} listing={l} />
          ))}
        </div>
      </Section>

      {/* Beef direct preview */}
      <Section tone="muted">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Beef Direct"
            title="Sell beef straight to the customer"
            description="Quarters, halves, wholes, and retail cuts from your own storefront. Take inquiries and orders without the middleman or the markup."
          />
          <Button asChild variant="outline">
            <Link href="/beef">
              Visit beef storefront <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {demoBeefBoxes.map((b) => (
            <BeefBoxCard key={b.id} box={b} />
          ))}
        </div>
      </Section>

      {/* Auctions preview */}
      <Section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Auctions"
            title="Run timed and live sales online"
            description="Catalog lots, take consignments, and let buyers bid from the barn or the pickup. Built for sale barns and production sales."
          />
          <Button asChild variant="outline">
            <Link href="/auctions">
              See how auctions work <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {demoAuctionLots.map((lot) => (
            <AuctionLotCard key={lot.id} lot={lot} />
          ))}
        </div>
      </Section>

      {/* AI receptionist preview */}
      <Section tone="ink">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow">AI Ranch Receptionist</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
              Never lose a sale to a missed call
            </h2>
            <p className="mt-4 text-lg text-ink-foreground/70">
              You&apos;re working cattle, not sitting by the phone. The
              receptionist answers questions on your site day and night using
              only the facts you give it, qualifies the buyer, and saves the
              lead so you can follow up.
            </p>
            <Button asChild className="mt-6">
              <Link href="/receptionist">
                See the receptionist <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <Card className="bg-bone text-foreground">
            <CardContent className="space-y-3 p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Example conversation
              </p>
              <div className="flex justify-end">
                <span className="max-w-[80%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground">
                  Do you have any bred heifers left for spring?
                </span>
              </div>
              <div className="flex justify-start">
                <span className="max-w-[85%] rounded-2xl bg-secondary px-3 py-2 text-sm">
                  We do — a group of registered Angus, bred to calve in March.
                  Can I grab your name and number so the owner can send details?
                </span>
              </div>
              <div className="flex justify-end">
                <span className="max-w-[80%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground">
                  Sure, it&apos;s Dale — 555-0142
                </span>
              </div>
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                Lead captured · added to your CRM
              </p>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* Ranch CRM preview */}
      <Section tone="muted">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: "Customers", body: "Buyers, sellers, and contacts in one book." },
                { label: "Leads", body: "Every inquiry tracked from new to sold." },
                { label: "Livestock records", body: "Tags, breeds, weights, and history." },
                { label: "Reminders", body: "Vaccinations, follow-ups, and to-dos." },
              ].map((f) => (
                <Card key={f.label}>
                  <CardContent className="pt-6">
                    <h3 className="font-display font-semibold">{f.label}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="eyebrow">Ranch CRM</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
              Know your herd and your customers
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Stop running your operation out of a notebook and your text
              messages. Keep your animals, your buyers, and your follow-ups
              where you can actually find them.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/crm">
                Explore the CRM <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </Section>

      {/* Trust / security */}
      <Section>
        <SectionHeading
          eyebrow="Built to be trusted"
          title="Your operation's data stays your operation's"
          description="OpenRange is multi-tenant from the ground up — honest engineering, not marketing badges."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ShieldCheck, title: "Row-level isolation", body: "Every record is scoped to your organization and enforced in the database, not just the app." },
            { icon: Lock, title: "Secure by default", body: "Authentication, session handling, and rate-limited public endpoints come standard." },
            { icon: FileText, title: "Stripe-powered billing", body: "Subscriptions and payments run on Stripe — we never store card numbers." },
            { icon: Users, title: "You own your data", body: "Your customers and listings are yours. No long-term contracts." },
          ].map((t) => (
            <div key={t.title} className="rounded-lg border border-border p-5">
              <t.icon className="size-6 text-primary" />
              <h3 className="mt-3 font-display font-semibold">{t.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Pricing preview */}
      <Section tone="muted">
        <div className="text-center">
          <p className="eyebrow">Pricing</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
            Plans that fit the operation
          </h2>
        </div>
        <div className="mx-auto mt-10 grid max-w-5xl gap-5 lg:grid-cols-3">
          {PURCHASABLE_PLANS.map((id) => {
            const plan = PLANS[id];
            return (
              <Card key={id} className={id === "pro" ? "border-primary ring-1 ring-primary/20" : ""}>
                <CardContent className="space-y-4 pt-6">
                  <div>
                    <h3 className="font-display text-lg font-bold">{plan.name}</h3>
                    <p className="text-2xl font-bold">{plan.priceLabel}</p>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {plan.features.slice(0, 4).map((f) => (
                      <li key={f} className="flex gap-2">
                        <Check className="size-4 shrink-0 text-primary" /> {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="mt-8 text-center">
          <Button asChild>
            <Link href="/pricing">See full pricing</Link>
          </Button>
        </div>
      </Section>

      {/* Demo CTA */}
      <section className="bg-ink text-ink-foreground">
        <div className="container flex flex-col items-center gap-6 py-16 text-center md:py-20">
          <div className="flex gap-3 text-accent">
            <Store className="size-6" />
            <Beef className="size-6" />
            <Gavel className="size-6" />
            <PhoneCall className="size-6" />
          </div>
          <h2 className="max-w-2xl font-display text-3xl font-bold tracking-tight md:text-4xl">
            See it running on your operation
          </h2>
          <p className="max-w-xl text-ink-foreground/70">
            Set up your ranch in a few minutes, or have us walk you through it.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">Get started free</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-ink-foreground/25 bg-transparent text-ink-foreground hover:bg-ink-foreground/10"
            >
              <Link href="/contact">Request a demo</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
