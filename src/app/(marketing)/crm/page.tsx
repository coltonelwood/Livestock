import type { Metadata } from "next";
import { Users, Target, Beef, Bell, StickyNote, FileText } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Section, SectionHeading } from "@/modules/marketing/components/section";
import { FeatureHero } from "@/modules/marketing/components/feature-hero";
import { MarketingCTA } from "@/modules/marketing/components/cta";

export const metadata: Metadata = {
  title: "Ranch CRM",
  description:
    "Customers, leads, livestock records, notes, and reminders — a CRM built for the way ranches actually work.",
};

const pillars = [
  { icon: Users, title: "Customers", body: "Every buyer, seller, hauler, and vet in one address book — with history and notes." },
  { icon: Target, title: "Leads", body: "Track inquiries from new to contacted to sold. Nothing falls through the cracks." },
  { icon: Beef, title: "Livestock records", body: "Tags, breeds, sexes, birth dates, and weights for the animals you're managing." },
  { icon: Bell, title: "Reminders", body: "Vaccinations, preg checks, follow-up calls — due dates you'll actually see." },
  { icon: StickyNote, title: "Notes", body: "Jot what was said and agreed on any customer or animal." },
  { icon: FileText, title: "Documents", body: "Keep health papers and registration docs attached where they belong." },
];

const pipeline = [
  { status: "New", name: "Dale Mercer", detail: "Asked about bred heifers", tone: "bg-secondary" },
  { status: "Contacted", name: "J. Whitfield", detail: "Sent cut sheet for half beef", tone: "bg-secondary" },
  { status: "Qualified", name: "Circle B Ranch", detail: "Wants 20 head, hauling May", tone: "bg-accent/15" },
  { status: "Won", name: "Sandoval Cattle", detail: "Bought 12 steers", tone: "bg-primary/10" },
];

export default function CrmPage() {
  return (
    <>
      <FeatureHero
        eyebrow="Ranch CRM"
        title="Run your operation, not your notebook"
        subtitle="Customers, leads, livestock, and follow-ups in one place — so you can stop digging through text messages to remember who wanted what."
        primaryCta={{ label: "Start free", href: "/signup" }}
        secondaryCta={{ label: "See pricing", href: "/pricing" }}
      />

      <Section>
        <SectionHeading eyebrow="What's inside" title="Everything the operation needs to remember" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.title} className="rounded-lg border border-border p-6">
              <p.icon className="size-6 text-primary" />
              <h3 className="mt-3 font-display text-lg font-semibold">{p.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeading
          eyebrow="Lead pipeline"
          title="See every deal from inquiry to sold"
          description="An example of how leads move through your pipeline."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pipeline.map((p) => (
            <Card key={p.name} className={p.tone}>
              <CardContent className="space-y-1 pt-6">
                <Badge variant="outline">{p.status}</Badge>
                <p className="pt-2 font-display font-semibold">{p.name}</p>
                <p className="text-sm text-muted-foreground">{p.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <MarketingCTA
        title="Get your operation organized"
        subtitle="Add your customers and animals in minutes — free to start."
      />
    </>
  );
}
