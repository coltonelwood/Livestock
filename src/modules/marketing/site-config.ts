export const siteConfig = {
  name: "OpenRange",
  tagline: "The operating system for modern livestock commerce.",
  description:
    "Built for ranchers, breeders, auction houses, haulers, and direct-to-consumer beef sellers. One platform for your marketplace listings, sales, customers, and the calls you can't always answer.",
  // Primary public navigation — everything here is browsable without an account.
  nav: [
    { title: "Marketplace", href: "/listings" },
    { title: "Beef Direct", href: "/beef" },
    { title: "Auctions", href: "/auctions" },
    { title: "AI Receptionist", href: "/receptionist" },
    { title: "Ranch CRM", href: "/crm" },
    { title: "Pricing", href: "/pricing" },
    { title: "About", href: "/about" },
  ],
} as const;

export type BusinessType =
  | "ranch"
  | "breeder"
  | "auction_house"
  | "hauler"
  | "processor"
  | "vet_feed_store";

export const businessTypes: {
  value: BusinessType;
  label: string;
  description: string;
}[] = [
  {
    value: "ranch",
    label: "Ranch / Cattle operation",
    description: "Cow-calf, stocker, or seedstock operation.",
  },
  {
    value: "breeder",
    label: "Breeder",
    description: "Registered seedstock, genetics, and breeding sales.",
  },
  {
    value: "auction_house",
    label: "Auction house / Sale barn",
    description: "Live and timed auctions, consignments.",
  },
  {
    value: "hauler",
    label: "Hauler / Transport",
    description: "Livestock transport and load board.",
  },
  {
    value: "processor",
    label: "Processor / Locker",
    description: "Custom and retail meat processing.",
  },
  {
    value: "vet_feed_store",
    label: "Vet / Feed store",
    description: "Veterinary clinics and feed/supply retail.",
  },
];
