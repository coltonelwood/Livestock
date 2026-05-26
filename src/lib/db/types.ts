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
  previous_bidder: string | null;
  lot_title: string;
};

export type Notification = {
  id: string;
  organization_id: string | null;
  type: string;
  recipient_email: string | null;
  subject: string | null;
  status: "queued" | "sent" | "failed" | "skipped";
  error: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  sent_at: string | null;
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

// ── Supervised agent operations system ──
export type AgentName =
  | "ops" | "code" | "growth" | "content" | "ad_creative" | "analytics"
  | "liquidity" | "seo" | "customer_success" | "revenue" | "trust_safety" | "design_ux"
  | "improve";

export type AgentRun = {
  id: string;
  agent: string;
  trigger: string;
  status: "running" | "success" | "failed" | "partial";
  summary: string | null;
  stats: Record<string, unknown>;
  error: string | null;
  started_at: string;
  finished_at: string | null;
};

export type AgentTask = Timestamps & {
  id: string;
  run_id: string | null;
  agent: string;
  title: string;
  detail: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  status: "proposed" | "approved" | "rejected" | "in_progress" | "done";
  payload: Record<string, unknown>;
  github_issue_url: string | null;
  github_pr_url: string | null;
  approved_by: string | null;
  approved_at: string | null;
};

export type QaFinding = {
  id: string;
  run_id: string | null;
  severity: "info" | "low" | "medium" | "high" | "critical";
  area: string;
  route: string | null;
  title: string;
  detail: string | null;
  screenshot_url: string | null;
  status: "open" | "acknowledged" | "resolved" | "ignored";
  github_issue_url: string | null;
  created_at: string;
};

export type GrowthLead = Timestamps & {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  region: string | null;
  category: "ranch" | "breeder" | "auction_house" | "beef_seller" | "other";
  source: string | null;
  status: "new" | "qualified" | "contacted" | "converted" | "rejected";
  notes: string | null;
};

export type OutreachDraft = {
  id: string;
  lead_id: string | null;
  prospect_id: string | null;
  channel: "email" | "sms" | "social_dm" | "mail";
  subject: string | null;
  body: string;
  status: "pending_approval" | "approved" | "rejected" | "sent";
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  created_at: string;
};

export type ProspectStage =
  | "discovered" | "reviewed" | "approved" | "contacted"
  | "responded" | "onboarding" | "active" | "inactive";

export type FoundingProspect = Timestamps & {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  social_url: string | null;
  state: string | null;
  county: string | null;
  category: "ranch" | "breeder" | "beef_seller" | "auction_house" | "other";
  what_they_sell: string | null;
  sells_cattle: boolean;
  sells_beef: boolean;
  weak_website: boolean;
  active_social: boolean;
  uses_messenger: boolean;
  runs_auctions: boolean;
  good_photos: boolean;
  owner_operated: boolean;
  fit_score: number;
  score_breakdown: Record<string, number>;
  stage: ProspectStage;
  tags: string[];
  notes: string | null;
  source: string | null;
  source_url: string | null;
  referred_by: string | null;
  organization_id: string | null;
  dedupe_key: string | null;
  created_by: string | null;
  last_contacted_at: string | null;
};

export type ProspectReferrer = {
  id: string;
  name: string;
  type: "rancher" | "auction" | "beef_buyer" | "partner" | "other";
  contact: string | null;
  reward_note: string | null;
  created_by: string | null;
  created_at: string;
};

export type ProspectEvent = {
  id: string;
  prospect_id: string;
  event_type: string;
  detail: string | null;
  created_by: string | null;
  created_at: string;
};

export type AgentAutonomy = {
  agent: string;
  tier: number;
  outreach_armed: boolean;
  daily_send_cap: number;
  cooldown_days: number;
  updated_by: string | null;
  updated_at: string;
};

export type OutboundMessage = Timestamps & {
  id: string;
  prospect_id: string | null;
  agent: string;
  channel: "email" | "contact_form" | "sms";
  to_contact: string | null;
  subject: string | null;
  body: string;
  status: "held" | "approved" | "queued" | "sent" | "failed" | "suppressed" | "cancelled";
  spam_risk: number;
  risk_reasons: string[];
  hold_reason: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
  provider_message_id: string | null;
  error: string | null;
  created_by: string | null;
  approved_by: string | null;
};

export type SuppressionEntry = {
  id: string;
  contact: string;
  reason: "opt_out" | "bounce" | "complaint" | "manual" | "hard_block";
  notes: string | null;
  created_at: string;
};

export type InboundReply = {
  id: string;
  prospect_id: string | null;
  from_contact: string | null;
  subject: string | null;
  body: string;
  classification: string | null;
  confidence: number | null;
  handled: boolean;
  created_at: string;
};

export type ContentDraft = {
  id: string;
  platform: "facebook" | "instagram" | "tiktok" | "x" | "youtube" | "email" | "blog";
  kind: string;
  title: string | null;
  body: string;
  status: "draft" | "pending_approval" | "approved" | "scheduled" | "published" | "rejected";
  scheduled_for: string | null;
  created_at: string;
};

export type AdCampaignDraft = {
  id: string;
  platform: "facebook" | "instagram" | "tiktok" | "google" | "youtube";
  objective: string | null;
  concept: string;
  copy: string | null;
  shot_list: string | null;
  budget_note: string | null;
  status: "draft" | "pending_approval" | "approved" | "rejected";
  created_at: string;
};

export type AnalyticsReport = {
  id: string;
  period: string | null;
  kind: string;
  title: string;
  body: string;
  metrics: Record<string, unknown>;
  created_at: string;
};

export type SeoTask = {
  id: string;
  target_type: string;
  target_id: string | null;
  title: string;
  recommendation: string;
  status: "proposed" | "approved" | "done" | "rejected";
  created_at: string;
};

export type ModerationItem = {
  id: string;
  entity_type: string;
  entity_id: string | null;
  organization_id: string | null;
  reason: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "pending" | "approved_action" | "dismissed";
  notes: string | null;
  created_at: string;
};

export type ChurnRisk = {
  id: string;
  organization_id: string | null;
  risk_level: "low" | "medium" | "high";
  signals: Record<string, unknown>;
  recommended_action: string | null;
  status: "open" | "actioned" | "resolved" | "ignored";
  created_at: string;
};

export type OptimizationSuggestion = {
  id: string;
  agent: string;
  area: string;
  title: string;
  detail: string | null;
  expected_impact: string | null;
  effort: string | null;
  status: "proposed" | "approved" | "done" | "rejected";
  created_at: string;
};

// ── Agent memory & learning layer ──
export type MemoryScope = "global" | "agent" | "org" | "user";

export type AgentMemory = Timestamps & {
  id: string;
  agent: string | null;
  memory_type: string;
  summary: string;
  detail: string | null;
  source: string | null;
  confidence_score: number;
  related_entity_type: string | null;
  related_entity_id: string | null;
  tags: string[];
  scope: MemoryScope;
  organization_id: string | null;
  user_id: string | null;
  status: "active" | "pending" | "rejected" | "archived";
  pinned: boolean;
  created_by: string | null;
  approved_by: string | null;
  last_used_at: string | null;
  expires_at: string | null;
};

export type AgentLesson = Timestamps & {
  id: string;
  agent: string;
  category: string;
  lesson: string;
  confidence_score: number;
  evidence_count: number;
  tags: string[];
  status: "proposed" | "approved" | "rejected" | "archived";
  approved_by: string | null;
};

export type AgentDecision = {
  id: string;
  run_id: string | null;
  agent: string;
  action: string;
  rationale: string | null;
  memory_ids: string[];
  expected_outcome: string | null;
  risk_level: "low" | "medium" | "high";
  confidence_score: number | null;
  created_at: string;
};

export type AgentFeedback = {
  id: string;
  agent: string | null;
  target_type: string;
  target_id: string | null;
  rating: "useful" | "not_useful" | "partial";
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type AgentExperiment = Timestamps & {
  id: string;
  agent: string;
  name: string;
  hypothesis: string;
  audience: string | null;
  success_metric: string | null;
  baseline: string | null;
  requires_spend: boolean;
  status: "proposed" | "approved" | "running" | "complete" | "adopted" | "rejected" | "retest" | "needs_data";
  decision: string | null;
  start_date: string | null;
  end_date: string | null;
  approved_by: string | null;
};

export type AgentExperimentResult = {
  id: string;
  experiment_id: string;
  variant: string;
  metric: string | null;
  value: number | null;
  sample_size: number | null;
  notes: string | null;
  recorded_at: string;
};

export type AgentPlaybook = Timestamps & {
  id: string;
  slug: string;
  title: string;
  objective: string | null;
  audience: string | null;
  steps: string | null;
  approved_angles: string[];
  disallowed_tactics: string[];
  success_metrics: string | null;
  examples: string | null;
  owner: string | null;
  version: number;
  status: "draft" | "active" | "pending_update" | "archived";
  pending_changes: Record<string, unknown> | null;
  proposed_by: string | null;
  approved_by: string | null;
};

export type AgentPreference = Timestamps & {
  id: string;
  scope: MemoryScope;
  agent: string | null;
  organization_id: string | null;
  user_id: string | null;
  key: string;
  value: string;
  created_by: string | null;
};

export type AgentKnowledgeSource = {
  id: string;
  name: string;
  url: string | null;
  kind: string;
  allowed: boolean;
  notes: string | null;
  created_at: string;
};

export type AgentPerformanceMetric = {
  id: string;
  agent: string;
  period: string | null;
  metric: string;
  value: number;
  detail: Record<string, unknown>;
  created_at: string;
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
      notifications: Def<Notification, "type">;
      agent_runs: Def<AgentRun, "agent">;
      agent_tasks: Def<AgentTask, "agent" | "title">;
      qa_findings: Def<QaFinding, "area" | "title">;
      growth_leads: Def<GrowthLead, "business_name">;
      outreach_drafts: Def<OutreachDraft, "body">;
      content_drafts: Def<ContentDraft, "platform" | "body">;
      ad_campaign_drafts: Def<AdCampaignDraft, "platform" | "concept">;
      analytics_reports: Def<AnalyticsReport, "title" | "body">;
      seo_tasks: Def<SeoTask, "target_type" | "title" | "recommendation">;
      moderation_queue: Def<ModerationItem, "entity_type" | "reason">;
      churn_risks: Def<ChurnRisk, "organization_id">;
      optimization_suggestions: Def<OptimizationSuggestion, "agent" | "area" | "title">;
      agent_memories: Def<AgentMemory, "memory_type" | "summary">;
      agent_lessons: Def<AgentLesson, "agent" | "category" | "lesson">;
      agent_decisions: Def<AgentDecision, "agent" | "action">;
      agent_feedback: Def<AgentFeedback, "target_type" | "rating">;
      agent_experiments: Def<AgentExperiment, "agent" | "name" | "hypothesis">;
      agent_experiment_results: Def<AgentExperimentResult, "experiment_id" | "variant">;
      agent_playbooks: Def<AgentPlaybook, "slug" | "title">;
      agent_preferences: Def<AgentPreference, "key" | "value">;
      agent_knowledge_sources: Def<AgentKnowledgeSource, "name">;
      agent_performance_metrics: Def<AgentPerformanceMetric, "agent" | "metric">;
      founding_prospects: Def<FoundingProspect, "business_name">;
      prospect_referrers: Def<ProspectReferrer, "name">;
      prospect_events: Def<ProspectEvent, "prospect_id" | "event_type">;
      agent_autonomy: Def<AgentAutonomy, "agent">;
      outbound_messages: Def<OutboundMessage, "body">;
      suppression_list: Def<SuppressionEntry, "contact">;
      inbound_replies: Def<InboundReply, "body">;
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
