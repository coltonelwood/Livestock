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

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

// Insert/Update helpers: db-defaulted columns become optional on insert.
type Defaulted = "id" | "created_at" | "updated_at";

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, Partial<Profile> & { id: string }, Partial<Profile>>;
      organizations: Table<
        Organization,
        Omit<Organization, Defaulted> & Partial<Pick<Organization, Defaulted>>,
        Partial<Organization>
      >;
      organization_members: Table<
        OrganizationMember,
        Omit<OrganizationMember, "id" | "created_at"> &
          Partial<Pick<OrganizationMember, "id" | "created_at">>,
        Partial<OrganizationMember>
      >;
      ranch_profiles: Table<
        RanchProfile,
        Omit<RanchProfile, "created_at" | "updated_at"> &
          Partial<Pick<RanchProfile, "created_at" | "updated_at">>,
        Partial<RanchProfile>
      >;
      customers: Table<
        Customer,
        Omit<Customer, Defaulted> & Partial<Pick<Customer, Defaulted>>,
        Partial<Customer>
      >;
      leads: Table<
        Lead,
        Omit<Lead, Defaulted> & Partial<Pick<Lead, Defaulted>>,
        Partial<Lead>
      >;
      livestock: Table<
        Livestock,
        Omit<Livestock, Defaulted> & Partial<Pick<Livestock, Defaulted>>,
        Partial<Livestock>
      >;
      reminders: Table<
        Reminder,
        Omit<Reminder, Defaulted> & Partial<Pick<Reminder, Defaulted>>,
        Partial<Reminder>
      >;
      livestock_listings: Table<
        LivestockListing,
        Omit<LivestockListing, Defaulted> &
          Partial<Pick<LivestockListing, Defaulted>>,
        Partial<LivestockListing>
      >;
      meat_products: Table<
        MeatProduct,
        Omit<MeatProduct, Defaulted> & Partial<Pick<MeatProduct, Defaulted>>,
        Partial<MeatProduct>
      >;
      listing_inquiries: Table<
        ListingInquiry,
        Omit<ListingInquiry, "id" | "created_at"> &
          Partial<Pick<ListingInquiry, "id" | "created_at">>,
        Partial<ListingInquiry>
      >;
      ai_agents: Table<
        AiAgent,
        Omit<AiAgent, Defaulted> & Partial<Pick<AiAgent, Defaulted>>,
        Partial<AiAgent>
      >;
      conversations: Table<
        Conversation,
        Omit<Conversation, Defaulted> & Partial<Pick<Conversation, Defaulted>>,
        Partial<Conversation>
      >;
      conversation_messages: Table<
        ConversationMessage,
        Omit<ConversationMessage, "id" | "created_at"> &
          Partial<Pick<ConversationMessage, "id" | "created_at">>,
        Partial<ConversationMessage>
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
