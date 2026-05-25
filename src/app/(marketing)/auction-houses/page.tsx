import type { Metadata } from "next";

import { AudiencePage } from "@/modules/marketing/components/audience-page";

export const metadata: Metadata = {
  title: "For auction houses",
  description: "OpenRange for sale barns and auction houses.",
};

export default function AuctionHousesPage() {
  return (
    <AudiencePage
      audience={{
        eyebrow: "For auction houses & sale barns",
        title: "Run your consignors and buyers from one platform",
        subtitle:
          "Manage relationships and inquiries today; live and timed auctions are on the roadmap with your data model already prepared.",
        benefits: [
          { title: "Consignor CRM", body: "Keep every consignor and buyer organized with notes and reminders." },
          { title: "Catch every inquiry", body: "AI receptionist fields sale-day questions and books follow-ups." },
          { title: "Listings & previews", body: "Promote upcoming lots with public pages and lead capture." },
          { title: "Auctions coming soon", body: "Live and timed bidding is in development — the schema is ready now." },
        ],
      }}
    />
  );
}
