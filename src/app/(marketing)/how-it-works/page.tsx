import type { Metadata } from "next";

import { MarketingCTA } from "@/modules/marketing/components/cta";

export const metadata: Metadata = {
  title: "How it works",
  description: "How OpenRange helps you capture leads and sell livestock.",
};

const steps = [
  {
    n: 1,
    title: "Create your account & business",
    body: "Sign up, tell us what kind of operation you run, and set up your profile in a couple of minutes.",
  },
  {
    n: 2,
    title: "Set up your lead assistant",
    body: "Add your FAQ and a greeting. The lead assistant answers common questions and captures a name and phone number, using only the facts you give it.",
  },
  {
    n: 3,
    title: "List your livestock & beef",
    body: "Publish listings and direct-to-consumer products. Each gets a public page with a built-in inquiry form.",
  },
  {
    n: 4,
    title: "Capture & work your leads",
    body: "Every chat and inquiry becomes a lead in your CRM. Track status, add notes, and never let a buyer slip away.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <section className="container py-16 md:py-24">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            How OpenRange works
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            From first inquiry to closed sale, everything in one place.
          </p>
        </div>

        <ol className="mx-auto mt-12 max-w-2xl space-y-8">
          {steps.map((s) => (
            <li key={s.n} className="flex gap-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                {s.n}
              </span>
              <div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <MarketingCTA />
    </>
  );
}
