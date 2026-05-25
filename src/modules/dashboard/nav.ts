import {
  LayoutDashboard,
  Target,
  MessagesSquare,
  Users,
  Tag,
  Beef,
  Bell,
  Bot,
  Store,
  Gavel,
  Package,
  CreditCard,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { title: string; href: string; icon: LucideIcon };

export const dashboardNav: NavItem[] = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { title: "Leads", href: "/dashboard/leads", icon: Target },
  { title: "Conversations", href: "/dashboard/conversations", icon: MessagesSquare },
  { title: "Customers", href: "/dashboard/customers", icon: Users },
  { title: "Listings", href: "/dashboard/listings", icon: Tag },
  { title: "Orders", href: "/dashboard/orders", icon: Package },
  { title: "Livestock", href: "/dashboard/livestock", icon: Beef },
  { title: "Reminders", href: "/dashboard/reminders", icon: Bell },
  { title: "Receptionist", href: "/dashboard/receptionist", icon: Bot },
  { title: "Marketplace", href: "/dashboard/marketplace", icon: Store },
  { title: "Auctions", href: "/dashboard/auctions", icon: Gavel },
  { title: "Billing", href: "/dashboard/billing", icon: CreditCard },
];
