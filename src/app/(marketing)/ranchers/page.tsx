import type { Metadata } from "next";

import { AudiencePage } from "@/modules/marketing/components/audience-page";

export const metadata: Metadata = {
  title: "For ranchers",
  description: "OpenRange for cow-calf, stocker, and seedstock operations.",
};

export default function RanchersPage() {
  return (
    <AudiencePage
      audience={{
        eyebrow: "For ranchers",
        title: "Spend less time on the phone, more time with the herd",
        subtitle:
          "OpenRange answers buyer questions, tracks your customers, and lists your cattle — so you never lose a sale to a missed call.",
        benefits: [
          { title: "Never miss a buyer", body: "Your AI receptionist answers inquiries day and night and captures every lead." },
          { title: "Know your herd", body: "Animal records, weights, and reminders for vaccinations and follow-ups." },
          { title: "Sell where buyers look", body: "Public listing pages with built-in inquiry forms that feed your CRM." },
          { title: "One place for everything", body: "Customers, leads, conversations, and listings in a single dashboard." },
        ],
      }}
    />
  );
}
