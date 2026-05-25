import Link from "next/link";
import { Check } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, honest pricing for ranches and livestock businesses.",
};

const tiers = [
  {
    name: "Starter",
    price: "$0",
    period: "/mo",
    description: "Get organized and capture your first leads.",
    features: ["CRM (customers, leads, notes)", "Up to 10 listings", "Lead Assistant (web chat)", "1 team member"],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/mo",
    description: "For working operations selling regularly.",
    features: ["Everything in Starter", "Unlimited listings", "D2C beef storefront", "Up to 5 team members", "Priority support"],
    cta: "Start free trial",
    featured: true,
  },
  {
    name: "Business",
    price: "Let's talk",
    period: "",
    description: "Auction houses and multi-location operations.",
    features: ["Everything in Pro", "Unlimited team members", "Online auctions & live bidding", "Dedicated onboarding"],
    cta: "Contact sales",
    featured: false,
  },
];

export default function PricingPage() {
  return (
    <div className="container py-16 md:py-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Simple pricing
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Start free. Upgrade when you&apos;re selling more. No long-term
          contracts.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {tiers.map((tier) => (
          <Card
            key={tier.name}
            className={cn(tier.featured && "border-primary shadow-md ring-1 ring-primary/20")}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{tier.name}</span>
                {tier.featured && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    Popular
                  </span>
                )}
              </CardTitle>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">{tier.price}</span>
                <span className="text-muted-foreground">{tier.period}</span>
              </div>
              <p className="text-sm text-muted-foreground">{tier.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="size-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full" variant={tier.featured ? "default" : "outline"}>
                <Link href={tier.name === "Business" ? "/contact" : "/signup"}>
                  {tier.cta}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Billing is not yet enabled in this preview. All plans currently start on
        the free tier.
      </p>
    </div>
  );
}
