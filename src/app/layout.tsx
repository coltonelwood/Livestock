import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "OpenRange — The OS for modern ranching",
    template: "%s · OpenRange",
  },
  description:
    "OpenRange is the operating system for modern ranching and livestock commerce: AI receptionist, ranch CRM, livestock marketplace, auctions, and direct-to-consumer beef.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
