/**
 * Demo / preview content for public pages. This is clearly-labelled EXAMPLE
 * data — it is never presented as a real seller and is never written to the
 * database. It lets visitors understand the marketplace, beef storefront, and
 * auctions before any real listings exist (and without signing up).
 */

export const DEMO_BADGE = "Example";

export type DemoListing = {
  id: string;
  title: string;
  breed: string;
  species: string;
  headCount: number;
  priceUsd: number | null;
  location: string;
  seller: string;
};

export const demoCattleListings: DemoListing[] = [
  {
    id: "demo-1",
    title: "Registered Black Angus bred heifers",
    breed: "Black Angus",
    species: "cattle",
    headCount: 24,
    priceUsd: 2850,
    location: "Ellis County, KS",
    seller: "Example Ranch",
  },
  {
    id: "demo-2",
    title: "Commercial Hereford steers, weaned",
    breed: "Hereford",
    species: "cattle",
    headCount: 60,
    priceUsd: 1450,
    location: "Custer County, MT",
    seller: "Example Cattle Co.",
  },
  {
    id: "demo-3",
    title: "Charolais herd bull, 2 yr, semen tested",
    breed: "Charolais",
    species: "cattle",
    headCount: 1,
    priceUsd: 6500,
    location: "Llano County, TX",
    seller: "Example Genetics",
  },
];

export type DemoBeefBox = {
  id: string;
  name: string;
  type: string;
  priceUsd: number;
  unit: string;
  detail: string;
  seller: string;
};

export const demoBeefBoxes: DemoBeefBox[] = [
  {
    id: "demo-beef-1",
    name: "Grass-fed quarter beef",
    type: "Quarter",
    priceUsd: 4.75,
    unit: "lb hanging weight",
    detail: "~110 lbs packaged · dry-aged 21 days",
    seller: "Example Ranch",
  },
  {
    id: "demo-beef-2",
    name: "Half beef share",
    type: "Half",
    priceUsd: 4.5,
    unit: "lb hanging weight",
    detail: "~220 lbs packaged · custom cut sheet",
    seller: "Example Ranch",
  },
  {
    id: "demo-beef-3",
    name: "Ribeye bundle (10 lb)",
    type: "Retail cut",
    priceUsd: 199,
    unit: "bundle",
    detail: "10 lbs of hand-cut ribeye steaks",
    seller: "Example Ranch",
  },
];

export type DemoAuctionLot = {
  id: string;
  lot: string;
  title: string;
  headCount: number;
  openingBidUsd: number;
  closes: string;
  seller: string;
};

export const demoAuctionLots: DemoAuctionLot[] = [
  {
    id: "demo-lot-1",
    lot: "Lot 14",
    title: "Fancy Angus-cross replacement heifers",
    headCount: 18,
    openingBidUsd: 1900,
    closes: "Closes Sat 7:00 PM CT",
    seller: "Example Sale Barn",
  },
  {
    id: "demo-lot-2",
    lot: "Lot 22",
    title: "Red Angus bred cows, 3–5 yr",
    headCount: 32,
    openingBidUsd: 2100,
    closes: "Closes Sat 7:30 PM CT",
    seller: "Example Sale Barn",
  },
  {
    id: "demo-lot-3",
    lot: "Lot 31",
    title: "Weaned Charolais-cross steers",
    headCount: 45,
    openingBidUsd: 1250,
    closes: "Closes Sat 8:00 PM CT",
    seller: "Example Sale Barn",
  },
];

export function formatUsd(value: number | null): string {
  if (value == null) return "Contact for price";
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}
