import type { OrderStatus } from "@/lib/db/types";

type BadgeVariant = "secondary" | "success" | "outline" | "destructive";

/** Buyer/seller-facing label + badge variant for an order status. */
export function orderStatusBadge(status: OrderStatus): {
  label: string;
  variant: BadgeVariant;
} {
  switch (status) {
    case "pending":
    case "pending_payment":
      return { label: "Awaiting payment", variant: "secondary" };
    case "paid":
      return { label: "Paid", variant: "success" };
    case "fulfilled":
      return { label: "Fulfilled", variant: "success" };
    case "cancelled":
      return { label: "Canceled", variant: "outline" };
    case "refunded":
      return { label: "Refunded", variant: "outline" };
    default:
      return { label: status, variant: "outline" };
  }
}
