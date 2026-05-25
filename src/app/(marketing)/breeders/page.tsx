import type { Metadata } from "next";

import { AudiencePage } from "@/modules/marketing/components/audience-page";

export const metadata: Metadata = {
  title: "For breeders",
  description: "OpenRange for registered seedstock and genetics programs.",
};

export default function BreedersPage() {
  return (
    <AudiencePage
      audience={{
        eyebrow: "For breeders",
        title: "Showcase your genetics and close more sales",
        subtitle:
          "From bull sales to embryo programs, manage your buyers, listings, and inquiries without spreadsheets.",
        benefits: [
          { title: "Buyer relationships", body: "Track repeat buyers, their interests, and your follow-ups in one CRM." },
          { title: "Genetics-ready records", body: "Capture breed, sire/dam, and performance notes on every animal." },
          { title: "Sale-ready listings", body: "Publish listings that capture leads automatically and route them to you." },
          { title: "AI that knows your program", body: "Train the receptionist on your FAQ so it answers like you would." },
        ],
      }}
    />
  );
}
