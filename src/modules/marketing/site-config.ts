export const siteConfig = {
  name: "OpenRange",
  tagline: "The operating system for modern ranching and livestock commerce.",
  description:
    "Run your whole operation in one place: an AI receptionist that never misses a call, a ranch CRM, a livestock marketplace, auctions, and direct-to-consumer beef sales.",
  nav: [
    { title: "How it works", href: "/how-it-works" },
    { title: "Ranchers", href: "/ranchers" },
    { title: "Breeders", href: "/breeders" },
    { title: "Auction houses", href: "/auction-houses" },
    { title: "Beef direct", href: "/beef" },
    { title: "Pricing", href: "/pricing" },
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
