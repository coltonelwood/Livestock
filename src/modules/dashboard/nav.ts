import {
  LayoutDashboard,
  Target,
  MessagesSquare,
  Users,
  Tag,
  Beef,
  Bell,
  PhoneCall,
  Store,
  Gavel,
  Package,
  CreditCard,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { title: string; href: string; icon: LucideIcon };

export const dashboardNav: NavItem[] = [
  { title: "Home", href: "/dashboard", icon: LayoutDashboard },
  { title: "Orders", href: "/dashboard/orders", icon: Package },
  { title: "Leads", href: "/dashboard/leads", icon: Target },
  { title: "Listings", href: "/dashboard/listings", icon: Tag },
  { title: "Customers", href: "/dashboard/customers", icon: Users },
  { title: "Auctions", href: "/dashboard/auctions", icon: Gavel },
  { title: "Livestock", href: "/dashboard/livestock", icon: Beef },
  { title: "Reminders", href: "/dashboard/reminders", icon: Bell },
  { title: "Lead Assistant", href: "/dashboard/receptionist", icon: PhoneCall },
  { title: "Inquiries", href: "/dashboard/conversations", icon: MessagesSquare },
  { title: "Storefront", href: "/dashboard/marketplace", icon: Store },
  { title: "Billing", href: "/dashboard/billing", icon: CreditCard },
];
