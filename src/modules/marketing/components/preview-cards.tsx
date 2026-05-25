import { MapPin } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DEMO_BADGE,
  formatUsd,
  type DemoAuctionLot,
  type DemoBeefBox,
  type DemoListing,
} from "@/modules/marketing/demo-data";

export function ExampleBadge() {
  return (
    <Badge variant="outline" className="border-accent/40 text-accent">
      {DEMO_BADGE}
    </Badge>
  );
}

export function DemoListingCard({ listing }: { listing: DemoListing }) {
  return (
    <Card className="h-full">
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-start justify-between gap-2">
          <span className="rounded bg-secondary px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-secondary-foreground">
            {listing.breed}
          </span>
          <ExampleBadge />
        </div>
        <h3 className="font-display text-lg font-semibold leading-snug">
          {listing.title}
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-3.5" /> {listing.location}
        </p>
        <div className="flex items-end justify-between border-t border-border pt-3">
          <div>
            <p className="text-lg font-bold text-primary">
              {formatUsd(listing.priceUsd)}
              {listing.headCount > 1 && (
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}
                  / head
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {listing.headCount} head · {listing.seller}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BeefBoxCard({ box }: { box: DemoBeefBox }) {
  return (
    <Card className="h-full">
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-start justify-between gap-2">
          <span className="rounded bg-secondary px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-secondary-foreground">
            {box.type}
          </span>
          <ExampleBadge />
        </div>
        <h3 className="font-display text-lg font-semibold">{box.name}</h3>
        <p className="text-sm text-muted-foreground">{box.detail}</p>
        <div className="border-t border-border pt-3">
          <p className="text-lg font-bold text-primary">
            {formatUsd(box.priceUsd)}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              / {box.unit}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">{box.seller}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function AuctionLotCard({ lot }: { lot: DemoAuctionLot }) {
  return (
    <Card className="h-full">
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-start justify-between gap-2">
          <span className="font-display text-sm font-bold text-accent">
            {lot.lot}
          </span>
          <ExampleBadge />
        </div>
        <h3 className="font-display text-lg font-semibold leading-snug">
          {lot.title}
        </h3>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {lot.closes}
        </p>
        <div className="flex items-end justify-between border-t border-border pt-3">
          <div>
            <p className="text-xs text-muted-foreground">Opening bid</p>
            <p className="text-lg font-bold text-primary">
              {formatUsd(lot.openingBidUsd)}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{lot.headCount} head</p>
        </div>
      </CardContent>
    </Card>
  );
}
