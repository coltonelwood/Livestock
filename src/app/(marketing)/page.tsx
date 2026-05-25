import Link from "next/link";
import {
  PhoneCall,
  Users,
  Store,
  Gavel,
  Truck,
  Beef,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: PhoneCall,
    title: "AI receptionist",
    body: "Answers your website chat, qualifies buyers, and turns every inquiry into a lead — day or night.",
  },
  {
    icon: Users,
    title: "Ranch CRM",
    body: "Customers, leads, notes, reminders, and livestock records in one place built for the way ranches actually work.",
  },
  {
    icon: Store,
    title: "Livestock marketplace",
    body: "List cattle and genetics with public listing pages and inquiry forms that capture leads automatically.",
  },
  {
    icon: Beef,
    title: "Beef direct-to-consumer",
    body: "Sell quarters, halves, and retail cuts straight from your storefront.",
  },
  {
    icon: Gavel,
    title: "Auctions",
    body: "Live and timed auctions for sale barns and breeders. (Coming soon.)",
  },
  {
    icon: Truck,
    title: "Transport load board",
    body: "Post and book livestock hauls. (Coming soon.)",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="container flex flex-col items-center gap-6 py-20 text-center md:py-28">
        <span className="rounded-full border bg-secondary px-4 py-1 text-sm font-medium text-secondary-foreground">
          Built for ranchers, breeders, and sale barns
        </span>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          The operating system for modern ranching
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          An AI receptionist that never misses a call, a CRM that knows your
          herd, and a marketplace to sell livestock and beef — all in one
          platform that works as hard as you do.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/signup">
              Start free <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/contact">Book a demo</Link>
          </Button>
        </div>
      </section>

      <section className="container grid gap-6 pb-24 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <Card key={f.title}>
            <CardContent className="space-y-3 pt-6">
              <div className="flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.body}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="border-t bg-primary text-primary-foreground">
        <div className="container flex flex-col items-center gap-6 py-16 text-center">
          <h2 className="text-3xl font-bold">
            Stop losing deals to missed calls.
          </h2>
          <p className="max-w-xl text-primary-foreground/80">
            Set up your ranch in minutes. No credit card required to start.
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link href="/signup">Create your account</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
