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
export type LeadSource = "web_chat" | "listing_inquiry" | "manual" | "import";
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
    };
    Views: { [_ in never]: never };
    Functions: {
      create_organization: {
        Args: { p_name: string; p_slug: string; p_business_type: BusinessType };
        Returns: string;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
