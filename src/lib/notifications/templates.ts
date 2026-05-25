/**
 * Pure email templates. Each builder returns subject/text/html from typed data.
 * No I/O — fully unit-testable. The enqueue layer renders these and hands them
 * to the provider.
 */

export type NotificationType =
  | "inquiry_confirmation"
  | "inquiry_alert"
  | "order_confirmation"
  | "order_alert"
  | "order_fulfilled"
  | "outbid"
  | "auction_won"
  | "payment_failed"
  | "lead_alert";

export type Rendered = { subject: string; text: string; html: string };

const money = (n: number) => `$${Number(n).toLocaleString("en-US")}`;

function wrap(lines: string[]): Pick<Rendered, "text" | "html"> {
  return {
    text: lines.join("\n"),
    html: lines.map((l) => `<p>${l}</p>`).join("\n"),
  };
}

export type TemplateData = {
  business?: string;
  buyerName?: string;
  itemTitle?: string;
  orderId?: string;
  total?: number;
  amount?: number;
  lotTitle?: string;
  leadName?: string;
  contact?: string;
};

/** Render an email for a notification type. */
export function buildEmail(type: NotificationType, d: TemplateData): Rendered {
  const biz = d.business ?? "the seller";
  switch (type) {
    case "inquiry_confirmation":
      return {
        subject: `We received your message to ${biz}`,
        ...wrap([
          `Thanks${d.buyerName ? `, ${d.buyerName}` : ""}!`,
          `Your inquiry${d.itemTitle ? ` about "${d.itemTitle}"` : ""} was sent to ${biz}.`,
          `They'll be in touch soon.`,
        ]),
      };
    case "inquiry_alert":
      return {
        subject: `New inquiry${d.itemTitle ? ` on ${d.itemTitle}` : ""}`,
        ...wrap([
          `You have a new inquiry${d.itemTitle ? ` on "${d.itemTitle}"` : ""}.`,
          d.leadName ? `From: ${d.leadName}` : "",
          d.contact ? `Contact: ${d.contact}` : "",
          `Open your dashboard to follow up.`,
        ].filter(Boolean)),
      };
    case "order_confirmation":
      return {
        subject: `Order confirmed${d.orderId ? ` · #${d.orderId.slice(0, 8)}` : ""}`,
        ...wrap([
          `Thanks for your order from ${biz}!`,
          d.total != null ? `Total: ${money(d.total)}` : "",
          `We'll let you know when it's ready.`,
        ].filter(Boolean)),
      };
    case "order_alert":
      return {
        subject: `New order${d.total != null ? ` · ${money(d.total)}` : ""}`,
        ...wrap([
          `You have a new paid order.`,
          d.total != null ? `Total: ${money(d.total)}` : "",
          `Fulfill it from your dashboard.`,
        ].filter(Boolean)),
      };
    case "order_fulfilled":
      return {
        subject: `Your order is on its way`,
        ...wrap([`${biz} marked your order as fulfilled. Thanks for your business!`]),
      };
    case "outbid":
      return {
        subject: `You've been outbid${d.lotTitle ? ` on ${d.lotTitle}` : ""}`,
        ...wrap([
          `Someone placed a higher bid${d.lotTitle ? ` on "${d.lotTitle}"` : ""}.`,
          d.amount != null ? `Current bid: ${money(d.amount)}` : "",
          `Place another bid to stay in it.`,
        ].filter(Boolean)),
      };
    case "auction_won":
      return {
        subject: `You won${d.lotTitle ? ` ${d.lotTitle}` : " the lot"}!`,
        ...wrap([
          `Congratulations — you won${d.lotTitle ? ` "${d.lotTitle}"` : " the lot"}.`,
          d.amount != null ? `Winning bid: ${money(d.amount)}` : "",
          `${biz} will reach out to settle up.`,
        ].filter(Boolean)),
      };
    case "payment_failed":
      return {
        subject: `Payment failed for your subscription`,
        ...wrap([`We couldn't process your latest payment. Please update your billing to avoid interruption.`]),
      };
    case "lead_alert":
      return {
        subject: `New lead from your AI receptionist`,
        ...wrap([
          `Your receptionist captured a new lead.`,
          d.leadName ? `Name: ${d.leadName}` : "",
          d.contact ? `Contact: ${d.contact}` : "",
        ].filter(Boolean)),
      };
  }
}
