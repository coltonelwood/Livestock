# OpenRange

**The operating system for modern ranching and livestock commerce.**

OpenRange is a multi-tenant SaaS platform for ranches, breeders, sale barns,
haulers, processors, and rural vets/feed stores. Phase 1 ships the platform
shell plus the first revenue wedge: an **AI receptionist**, a **ranch CRM**, and
a **livestock + direct-to-consumer beef marketplace**.

## Stack

- **Next.js 15** (App Router) · **TypeScript** · **Tailwind CSS** · shadcn-style UI
- **Supabase** — Postgres, Auth, Storage, Realtime (Row Level Security throughout)
- **Anthropic Claude** — AI receptionist
- Stripe · Twilio/Telnyx · PostHog — scaffolded for later phases

## What's real vs. placeholder (Phase 1)

| Real & working | Placeholder (schema + UI, not wired) |
| --- | --- |
| Email/password auth, org onboarding, multi-tenant RLS | Live & timed auctions + bids |
| CRM: customers, leads, notes, livestock, reminders | Transport load board |
| Listings: livestock + D2C beef, public pages, inquiry → lead | SMS / voice receptionist |
| AI receptionist web chat (real Claude calls) + lead capture | Orders / checkout |
| Stripe billing + Checkout + Customer Portal + entitlements | |
| Admin dashboard + moderation | |

See [`docs/PRD.md`](docs/PRD.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md),
and [`docs/SCHEMA.md`](docs/SCHEMA.md) for the full plan.

## Prerequisites

- Node.js 20+ and npm
- A Supabase project (free tier is fine)
- An Anthropic API key (for the receptionist)
- An Upstash Redis database (for durable rate limiting; free tier is fine)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
#   Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#   SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, and the Upstash Redis
#   credentials (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).

# 3. Apply the database migrations to your Supabase project
#    Option A — Supabase CLI (recommended):
#       supabase link --project-ref <your-ref>
#       supabase db push
#    Option B — paste each file in supabase/migrations/*.sql (in order)
#    into the Supabase SQL editor and run them.

# 4. Regenerate typed DB definitions (optional but recommended)
#    npx supabase gen types typescript --project-id <id> > src/lib/db/types.gen.ts
#    then point the Database import at it.

# 5. Run the app
npm run dev      # http://localhost:3000
```

### Supabase Auth note

For the smoothest local flow, disable "Confirm email" in your Supabase project
(Authentication → Providers → Email) so signup logs you straight into
onboarding. With confirmation on, users get a magic link that routes through
`/auth/callback`.

### Granting yourself platform admin

The admin dashboard (`/admin`) requires `platform_role = 'platform_admin'`.
Set it once via the Supabase SQL editor (this column is protected from
self-promotion in the app):

```sql
update public.profiles set platform_role = 'platform_admin'
where email = 'you@example.com';
```

## Scripts

```bash
npm run dev         # start dev server
npm run build       # production build
npm run start       # run the production build
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm test            # vitest unit tests
```

## Testing

- **Unit tests** (`npm test`) cover pure logic: class merging, org validation,
  the receptionist prompt builder, and contact extraction.
- **Database / RLS tests**: `supabase/tests/run-local.sh` spins up a throwaway
  Postgres, applies every migration, and runs a cross-tenant isolation suite
  proving the RLS policies hold. Requires a local Postgres install but **no
  Supabase project**. See [`supabase/tests/README.md`](supabase/tests/README.md).

## Rate limiting

Public endpoints (AI chat, listing inquiries, contact form) are protected by
durable, multi-dimensional rate limiting backed by **Upstash Redis**
(`src/lib/ratelimit.ts`), keyed by IP and by organization/listing. When Redis is
**not configured or unreachable**, public AI endpoints **fail closed** (deny),
while the authenticated dashboard test panel **fails open**. Limits live in
`LIMITS` and are covered by unit tests.

## Billing (Stripe)

Organizations subscribe to plans (Starter $99 / Pro $299 / Enterprise $999) via
Stripe Checkout and self-serve through the Stripe Customer Portal. Feature
access is controlled by **server-side entitlements** — the client is never
trusted.

| Plan | Active listings | Advanced AI | Storefront | Auctions |
| --- | --- | --- | --- | --- |
| Free (default) / Starter | 5 | — | — | — |
| Pro | Unlimited | ✅ | ✅ | — |
| Enterprise | Unlimited | ✅ | ✅ | ✅ |

Entitlement helpers live in `src/modules/billing/entitlements.ts`
(`getOrganizationSubscription`, `requireActiveSubscription`, `canCreateListing`,
`canAccessAuctionTools`, `canUseAdvancedAI`). A non-active subscription
(past_due/canceled) is downgraded to free, blocking gated features immediately.
If Stripe is unconfigured the app runs entirely on the free tier.

### Stripe test-mode setup

1. In the Stripe dashboard (test mode), create three recurring **products /
   prices**: Starter $99/mo, Pro $299/mo, Enterprise $999/mo. Copy each price ID
   (`price_...`).
2. Set the env vars in `.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...        # from `stripe listen` (below)
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_STARTER_PRICE_ID=price_...
   STRIPE_PRO_PRICE_ID=price_...
   STRIPE_ENTERPRISE_PRICE_ID=price_...
   ```
3. Forward webhooks to your local server with the Stripe CLI:
   ```
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Use the printed signing secret as `STRIPE_WEBHOOK_SECRET`.
4. Go to **Dashboard → Billing**, choose a plan, and pay with Stripe's test card
   `4242 4242 4242 4242`. The webhook updates the org's subscription and plan.
5. Use **Manage billing** to open the Customer Portal (upgrade/downgrade/cancel).

The webhook handler verifies the Stripe signature, processes
`checkout.session.completed`, `customer.subscription.*`, and `invoice.payment_*`
events, and writes an `audit_logs` entry for each.

**Idempotency.** Every event is recorded in `stripe_events` keyed by the Stripe
event id. A redelivery of an already-processed event returns `200` with
`{ duplicate: true }` and re-applies nothing — no duplicate subscription writes
or audit logs. Events that fail mid-processing are recorded as `failed` and
reprocessed on Stripe's next retry. The decision logic
(`src/modules/billing/idempotency.ts`) is unit-tested.

## Project structure

```
src/
  app/            route groups: (marketing) (auth) (app) admin, api/
  modules/        feature modules: marketing, auth, organizations, crm,
                  listings, receptionist, admin
  lib/            supabase clients, auth/session, env, ai (Claude), db types
  components/ui/  design-system primitives
supabase/
  migrations/     ordered SQL migrations (schema + RLS)
  tests/          RLS isolation harness
docs/             PRD, architecture, schema, checklists
```

Modules talk to each other only through `lib/` and exported server actions —
never by reaching into another module's internals.

## Deployment

Deploy on Vercel + Supabase. Walk the
[deployment checklist](docs/DEPLOYMENT_CHECKLIST.md) and the
[security checklist](docs/SECURITY_CHECKLIST.md) before going live.
