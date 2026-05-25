import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { ContactForm } from "@/modules/marketing/components/contact-form";

export const metadata: Metadata = {
  title: "Contact & demo",
  description: "Talk to the OpenRange team or book a demo.",
};

export default function ContactPage() {
  return (
    <div className="container grid gap-10 py-16 md:grid-cols-2 md:py-24">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Let&apos;s talk</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Tell us about your operation and we&apos;ll show you how OpenRange can
          help you capture more leads and sell more livestock.
        </p>
        <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
          <li>• See the lead assistant live</li>
          <li>• Get help importing your customers</li>
          <li>• Ask about pricing for your business</li>
        </ul>
      </div>
      <Card>
        <CardContent className="pt-6">
          <ContactForm />
        </CardContent>
      </Card>
    </div>
  );
}
