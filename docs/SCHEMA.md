# OpenRange — Database Schema & ERD

Postgres on Supabase. **Every business table carries `organization_id` and is
protected by Row Level Security.** Tenancy is enforced in the database, not just
in app code.

## ERD summary

```
auth.users (Supabase managed)
   │ 1:1
   ▼
profiles (id = auth.users.id, platform_role)
   │ N:M via
   ▼
organization_members (organization_id, user_id, role) ──► organizations
                                                              │ 1:1
                                                              ▼
                                                        ranch_profiles

organizations 1:N ─┬─ customers ──1:N── notes (polymorphic owner)
                   ├─ leads ──────► customers (optional)
                   ├─ livestock
                   ├─ reminders (polymorphic owner)
                   ├─ documents (polymorphic owner)
                   ├─ livestock_listings ──► livestock (optional)
                   ├─ meat_products
                   ├─ listing_inquiries ──► (listing) ──creates──► leads
                   ├─ ai_agents ──1:N── ai_interactions
                   ├─ conversations ──1:N── conversation_messages
                   ├─ orders            (placeholder)
                   ├─ auctions ──1:N── bids   (placeholder)
                   ├─ transport_jobs    (placeholder)
                   ├─ subscriptions     (Stripe-ready placeholder)
                   └─ audit_logs
```

## Enums

| Enum | Values |
| --- | --- |
| `business_type` | ranch, breeder, auction_house, hauler, processor, vet_feed_store |
| `org_role` | owner, admin, member |
| `platform_role` | user, platform_admin |
| `lead_status` | new, contacted, qualified, won, lost |
| `lead_source` | web_chat, listing_inquiry, manual, import |
| `conversation_channel` | web_chat, sms, voice, email |
| `message_role` | visitor, assistant, agent, system |
| `listing_status` | draft, active, sold, archived |
| `species` | cattle, sheep, goat, horse, swine, poultry, other |
| `meat_product_type` | quarter, half, whole, retail_cut, bundle, other |
| `order_status` | pending, paid, fulfilled, cancelled |
| `auction_status` | scheduled, live, ended, cancelled |
| `transport_status` | open, booked, in_transit, delivered, cancelled |
| `subscription_status` | trialing, active, past_due, canceled, incomplete |
| `reminder_status` | pending, done, cancelled |

## Tables (key columns)

- **profiles** — `id` (=auth.users), `full_name`, `email`, `phone`,
  `platform_role`, timestamps. 1:1 with auth user; created by signup trigger.
- **organizations** — `id`, `name`, `slug` (unique), `business_type`,
  `created_by`, timestamps.
- **organization_members** — `organization_id`, `user_id`, `role`,
  unique(org,user).
- **ranch_profiles** — `organization_id` (unique), `display_name`, `bio`,
  `location`, `website`, `phone`, `email`, `faq` (jsonb), `is_public`.
- **customers** — org-scoped contacts: name, email, phone, address, tags, notes.
- **leads** — `organization_id`, `customer_id?`, `source`, `status`, contact
  fields, `summary`, `score`, `conversation_id?`.
- **notes** — polymorphic (`entity_type`, `entity_id`) org-scoped notes.
- **livestock** — animal records: `tag`, `species`, `breed`, `sex`, `birth_date`,
  `weight`, `status`, `metadata` jsonb.
- **reminders** — `due_at`, `title`, `status`, polymorphic link, `assigned_to`.
- **documents** — Storage object metadata: `name`, `path`, `mime`, `size`,
  polymorphic link.
- **livestock_listings** — `species`, `title`, `description`, `price`, `quantity`,
  `location`, `seller_name`, `status`, `livestock_id?`, `photos` jsonb.
- **meat_products** — `name`, `product_type`, `price`, `unit`, `inventory`,
  `description`, `photos`, `status`.
- **listing_inquiries** — public inquiry capture; links to a listing, creates a
  lead.
- **ai_agents** — receptionist config per org: `name`, `type`, `greeting`,
  `system_prompt`, `qualification_questions` jsonb, `is_active`.
- **conversations** — `channel`, `agent_id?`, `customer_id?`, `lead_id?`,
  `visitor_name`, `visitor_contact`, `status`, `metadata`.
- **conversation_messages** — `conversation_id`, `role`, `content`, `metadata`.
- **ai_interactions** — telemetry: `agent_id?`, `conversation_id?`, `model`,
  `prompt_tokens`, `completion_tokens`, `latency_ms`, `cost_usd`.
- **orders / auctions / bids / transport_jobs** — Phase 2/3 placeholders, full
  org-scoped + RLS so the model is stable.
- **subscriptions** — `plan`, `status`, `stripe_customer_id`,
  `stripe_subscription_id`, `current_period_end`.
- **audit_logs** — `actor_id`, `organization_id?`, `action`, `entity_type`,
  `entity_id`, `metadata`.

## RLS model

- **Helper functions** (SECURITY DEFINER, so they don't recurse through RLS):
  `is_org_member(org)`, `is_org_admin(org)`, `is_platform_admin()`,
  `shares_org(target_user)`.
- **Default deny.** RLS is enabled on every table; access is granted only by
  explicit policy.
- **Member read / admin write** is the default org pattern.
- **Public reads:** anon may `SELECT` `livestock_listings`/`meat_products`
  where `status = 'active'`, and `ranch_profiles` where `is_public = true`.
- **Public writes** (chat, inquiries) do NOT use broad anon policies; they go
  through trusted server routes using the service role with validation +
  rate limiting (treated like webhooks).
- **Privilege-escalation guard:** a trigger blocks non-admins from changing
  `profiles.platform_role`.

See `supabase/migrations/*` for the authoritative definitions.
