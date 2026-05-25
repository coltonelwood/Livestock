import type { Metadata } from "next";
import { Clock, ListChecks, ShieldCheck, UserPlus } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Section, SectionHeading } from "@/modules/marketing/components/section";
import { FeatureHero } from "@/modules/marketing/components/feature-hero";
import { MarketingCTA } from "@/modules/marketing/components/cta";

export const metadata: Metadata = {
  title: "AI Ranch Receptionist",
  description:
    "An AI receptionist that answers buyer questions, qualifies leads, and captures contacts on your ranch website — day and night.",
};

const capabilities = [
  { icon: Clock, title: "Answers around the clock", body: "Buyers ask questions at 6 a.m. and 10 p.m. The receptionist is there when you're in the saddle or asleep." },
  { icon: ShieldCheck, title: "Sticks to your facts", body: "It only answers from the business profile and FAQ you give it. It won't invent prices or make promises." },
  { icon: ListChecks, title: "Qualifies the buyer", body: "It works your qualification questions into the conversation so you know who's serious." },
  { icon: UserPlus, title: "Captures every lead", body: "Names, numbers, and the whole conversation are saved to your CRM automatically." },
];

export default function ReceptionistPage() {
  return (
    <>
      <FeatureHero
        eyebrow="AI Ranch Receptionist"
        title="The hand that always answers the phone"
        subtitle="You can't stop working to answer every message. Put a receptionist on your site that handles buyer questions, qualifies them, and never lets a lead slip through the gate."
        primaryCta={{ label: "Set up your receptionist", href: "/signup" }}
        secondaryCta={{ label: "See pricing", href: "/pricing" }}
      />

      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="What it does"
              title="A real conversation, not a phone tree"
            />
            <div className="mt-8 space-y-6">
              {capabilities.map((c) => (
                <div key={c.title} className="flex gap-4">
                  <c.icon className="mt-0.5 size-6 shrink-0 text-primary" />
                  <div>
                    <h3 className="font-display font-semibold">{c.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Card>
            <CardContent className="space-y-3 p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Example conversation
              </p>
              <div className="flex justify-start">
                <span className="max-w-[85%] rounded-2xl bg-secondary px-3 py-2 text-sm">
                  Howdy! Thanks for stopping by Cross Creek Cattle. How can I help?
                </span>
              </div>
              <div className="flex justify-end">
                <span className="max-w-[80%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground">
                  Do you sell half beef? What does it run?
                </span>
              </div>
              <div className="flex justify-start">
                <span className="max-w-[85%] rounded-2xl bg-secondary px-3 py-2 text-sm">
                  We do — halves are grass-fed and dry-aged, priced by hanging
                  weight. I can have the owner send the current rate and cut
                  sheet. What&apos;s the best number for you?
                </span>
              </div>
              <div className="flex justify-end">
                <span className="max-w-[80%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground">
                  555-0142, thanks!
                </span>
              </div>
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                Lead captured · added to your CRM
              </p>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeading
          eyebrow="Setup"
          title="Up and running in an afternoon"
          description="No scripts to code. Fill in your business details and FAQ, drop in your questions, and test it live before it goes on your site."
        />
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            "Add your ranch profile and FAQ",
            "Set the questions it should ask buyers",
            "Test the chat, then turn it on",
          ].map((step, i) => (
            <li key={step} className="rounded-lg border border-border bg-background p-6">
              <span className="font-display text-2xl font-bold text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="mt-2 font-medium">{step}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm text-muted-foreground">
          The receptionist runs on Anthropic&apos;s Claude. It requires an API
          key to be configured on your deployment.
        </p>
      </Section>

      <MarketingCTA
        title="Stop losing buyers to voicemail"
        subtitle="Set up your AI receptionist and capture every inquiry."
      />
    </>
  );
}
