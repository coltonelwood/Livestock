/**
 * Hand-maintained database types for the tables touched in Phase 1.
 *
 * Regenerate the full, authoritative version once a Supabase project exists:
 *   npx supabase gen types typescript --project-id <id> > src/lib/db/types.gen.ts
 * and switch the `Database` import to that file. Until then this subset keeps
 * the app type-safe at the query boundary.
 */

export type BusinessType =
  | "ranch"
  | "breeder"
  | "auction_house"
  | "hauler"
  | "processor"
  | "vet_feed_store";
export type OrgRole = "owner" | "admin" | "member";
export type PlatformRole = "user" | "platform_admin";
export type LeadStatus = "new" | "contacted" | "qualified" | "won" | "lost";
export type LeadSource =
  | "web_chat"
  | "listing_inquiry"
  | "auction"
  | "order"
  | "manual"
  | "import";
export type Species =
  | "cattle"
  | "sheep"
  | "goat"
  | "horse"
  | "swine"
  | "poultry"
  | "other";
export type ListingStatus = "draft" | "active" | "sold" | "archived";
export type MeatProductType =
  | "quarter"
  | "half"
  | "whole"
  | "retail_cut"
  | "bundle"
  | "other";
export type ConversationChannel = "web_chat" | "sms" | "voice" | "email";
export type MessageRole = "visitor" | "assistant" | "agent" | "system";
export type ReminderStatus = "pending" | "done" | "cancelled";

type Timestamps = { created_at: string; updated_at: string };

export type ContactRequest = {
  id: string;
  name: string;
  email: string;
  business: string | null;
  message: string | null;
  created_at: string;
};

export type AuditLog = {
  id: string;
  actor_id: string | null;
  organization_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete";

export type Subscription = Timestamps & {
  id: string;
  organization_id: string;
  plan: string;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  price_id: string | null;
  current_period_end: string | null;
};

export type StripeEventStatus = "processing" | "processed" | "failed";

export type StripeEvent = {
  id: string;
  type: string;
  organization_id: string | null;
  status: StripeEventStatus;
  error: string | null;
  processed_at: string | null;
  claimed_at: string;
  created_at: string;
};

export type AiInteraction = {
  id: string;
  organization_id: string;
  agent_id: string | null;
  conversation_id: string | null;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  latency_ms: number | null;
  cost_usd: number | null;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  platform_role: PlatformRole;
}

export type Organization = Timestamps & {
  id: string;
  name: string;
  slug: string;
  business_type: BusinessType;
  created_by: string | null;
}

export type OrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
}

export type RanchProfile = Timestamps & {
  organization_id: string;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  faq: { question: string; answer: string }[];
  is_public: boolean;
}

export type Customer = Timestamps & {
  id: string;
  organization_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  tags: string[];
  notes: string | null;
  created_by: string | null;
}

export type Lead = Timestamps & {
  id: string;
  organization_id: string;
  customer_id: string | null;
  conversation_id: string | null;
  source: LeadSource;
  status: LeadStatus;
  name: string | null;
  email: string | null;
  phone: string | null;
  summary: string | null;
  score: number | null;
  metadata: Record<string, unknown>;
}

export type Note = Timestamps & {
  id: string;
  organization_id: string;
  entity_type: string;
  entity_id: string;
  body: string;
  created_by: string | null;
};

export type Livestock = Timestamps & {
  id: string;
  organization_id: string;
  tag: string | null;
  name: string | null;
  species: Species;
  breed: string | null;
  sex: string | null;
  birth_date: string | null;
  weight_lbs: number | null;
  status: string;
  metadata: Record<string, unknown>;
}

export type Reminder = Timestamps & {
  id: string;
  organization_id: string;
  title: string;
  body: string | null;
  due_at: string;
  status: ReminderStatus;
  entity_type: string | null;
  entity_id: string | null;
  assigned_to: string | null;
  created_by: string | null;
}

export type LivestockListing = Timestamps & {
  id: string;
  organization_id: string;
  livestock_id: string | null;
  title: string;
  description: string | null;
  species: Species;
  breed: string | null;
  quantity: number;
  price_usd: number | null;
  location: string | null;
  seller_name: string | null;
  photos: string[];
  status: ListingStatus;
  created_by: string | null;
}

export type MeatProduct = Timestamps & {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  product_type: MeatProductType;
  price_usd: number | null;
  unit: string;
  inventory: number | null;
  photos: string[];
  status: ListingStatus;
  seller_name: string | null;
  created_by: string | null;
}

export type ListingInquiry = {
  id: string;
  organization_id: string;
  listing_type: "livestock" | "meat";
  listing_id: string;
  lead_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  created_at: string;
}

export type AiAgent = Timestamps & {
  id: string;
  organization_id: string;
  name: string;
  type: string;
  greeting: string | null;
  system_prompt: string | null;
  qualification_questions: string[];
  is_active: boolean;
}

export type Conversation = Timestamps & {
  id: string;
  organization_id: string;
  agent_id: string | null;
  customer_id: string | null;
  lead_id: string | null;
  channel: ConversationChannel;
  status: string;
  visitor_name: string | null;
  visitor_contact: string | null;
  metadata: Record<string, unknown>;
}

export type ConversationMessage = {
  id: string;
  conversation_id: string;
  organization_id: string;
  role: MessageRole;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * On insert, every column is optional EXCEPT the ones named in `Required`
 * (NOT NULL columns with no database default). Everything else is filled by a
 * default or is nullable.
 */
type Insertable<Row, Required extends keyof Row> = Partial<Row> &
  Pick<Row, Required>;

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type Def<Row, Required extends keyof Row> = Table<
  Row,
  Insertable<Row, Required>,
  Partial<Row>
>;

export type AuctionStatus = "scheduled" | "live" | "ended" | "cancelled";
export type LotStatus = "open" | "sold" | "passed" | "cancelled";

export type Auction = Timestamps & {
  id: string;
  organization_id: string;
  listing_id: string | null;
  title: string;
  description: string | null;
  location: string | null;
  status: AuctionStatus;
  starts_at: string | null;
  ends_at: string | null;
  starting_price_usd: number | null;
  reserve_price_usd: number | null;
};

export type AuctionLot = Timestamps & {
  id: string;
  auction_id: string;
  organization_id: string;
  lot_number: number;
  title: string;
  description: string | null;
  species: Species;
  head_count: number;
  opening_bid_usd: number;
  reserve_price_usd: number | null;
  bid_increment_usd: number;
  status: LotStatus;
  current_bid_usd: number | null;
  current_bidder_id: string | null;
  bid_count: number;
  closes_at: string | null;
  photos: string[];
};

export type Bid = {
  id: string;
  lot_id: string | null;
  auction_id: string;
  organization_id: string;
  bidder_id: string | null;
  amount_usd: number;
  created_at: string;
};

/** Shape returned by the place_bid() RPC. */
export type PlaceBidResult = {
  ok: boolean;
  lot_id: string;
  current_bid: number;
  bid_count: number;
  min_next_bid: number;
};

export type OrderStatus =
  | "pending"
  | "pending_payment"
  | "paid"
  | "fulfilled"
  | "cancelled"
  | "refunded";

export type Order = Timestamps & {
  id: string;
  organization_id: string;
  customer_id: string | null;
  buyer_id: string | null;
  buyer_email: string | null;
  status: OrderStatus;
  total_usd: number | null;
  currency: string;
  items: unknown;
  stripe_payment_intent: string | null;
  stripe_checkout_session_id: string | null;
  paid_at: string | null;
  fulfilled_at: string | null;
  canceled_at: string | null;
  refunded_at: string | null;
};

export type OrderItem = {
  id: string;
  order_id: string;
  organization_id: string;
  buyer_id: string | null;
  product_id: string | null;
  name: string;
  unit_price_usd: number;
  quantity: number;
  line_total_usd: number;
  created_at: string;
};

export type PlaceOrderResult = {
  order_id: string;
  total: number;
  organization_id: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: Def<Profile, "id">;
      organizations: Def<Organization, "name" | "slug" | "business_type">;
      organization_members: Def<OrganizationMember, "organization_id" | "user_id">;
      ranch_profiles: Def<RanchProfile, "organization_id">;
      customers: Def<Customer, "organization_id" | "name">;
      leads: Def<Lead, "organization_id">;
      notes: Def<Note, "organization_id" | "entity_type" | "entity_id" | "body">;
      livestock: Def<Livestock, "organization_id">;
      reminders: Def<Reminder, "organization_id" | "title" | "due_at">;
      livestock_listings: Def<LivestockListing, "organization_id" | "title">;
      meat_products: Def<MeatProduct, "organization_id" | "name">;
      listing_inquiries: Def<
        ListingInquiry,
        "organization_id" | "listing_type" | "listing_id" | "name"
      >;
      ai_agents: Def<AiAgent, "organization_id">;
      conversations: Def<Conversation, "organization_id">;
      conversation_messages: Def<
        ConversationMessage,
        "conversation_id" | "organization_id" | "role" | "content"
      >;
      ai_interactions: Def<AiInteraction, "organization_id">;
      contact_requests: Def<ContactRequest, "name" | "email">;
      subscriptions: Def<Subscription, "organization_id">;
      audit_logs: Def<AuditLog, "action">;
      stripe_events: Def<StripeEvent, "id" | "type">;
      auctions: Def<Auction, "organization_id" | "title">;
      auction_lots: Def<
        AuctionLot,
        "auction_id" | "organization_id" | "lot_number" | "title"
      >;
      bids: Def<Bid, "auction_id" | "organization_id" | "amount_usd">;
      orders: Def<Order, "organization_id">;
      order_items: Def<
        OrderItem,
        "order_id" | "organization_id" | "name" | "unit_price_usd" | "quantity" | "line_total_usd"
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      create_organization: {
        Args: { p_name: string; p_slug: string; p_business_type: BusinessType };
        Returns: string;
      };
      place_bid: {
        Args: { p_lot_id: string; p_amount: number };
        Returns: PlaceBidResult;
      };
      start_auction: { Args: { p_auction: string }; Returns: undefined };
      end_auction: { Args: { p_auction: string }; Returns: undefined };
      close_auction: { Args: { p_auction: string }; Returns: undefined };
      cancel_auction: { Args: { p_auction: string }; Returns: undefined };
      cancel_lot: { Args: { p_lot: string }; Returns: undefined };
      place_order: {
        Args: { p_items: { product_id: string; quantity: number }[] };
        Returns: PlaceOrderResult;
      };
      mark_order_paid: { Args: { p_order: string; p_session?: string }; Returns: undefined };
      expire_order: { Args: { p_order: string }; Returns: undefined };
      cancel_order: { Args: { p_order: string }; Returns: undefined };
      fulfill_order: { Args: { p_order: string }; Returns: undefined };
      refund_order: { Args: { p_order: string }; Returns: undefined };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
