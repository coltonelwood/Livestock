# OpenRange — Launch QA

Status legend: ✅ verified by automated tests/build · 🟡 works in code, needs
live infra (Stripe/Resend/Supabase Storage/Anthropic) to fully verify · ⛔ not
built yet.

## How to verify locally

```bash
npm run typecheck      # types
npm run lint           # eslint
npm test               # 95 unit tests
npm run build          # production build (all routes compile)
supabase/tests/run-local.sh   # boots throwaway Postgres, applies all migrations,
                              # runs RLS + auction + DTC-order SQL suites
```

All of the above pass as of this document. Live-infra paths additionally require
the env vars in `.env.example`.

## Walkthroughs

### 1. Anonymous buyer ✅
Browse `/`, `/listings`, `/beef`, `/auctions`, `/ranch/[id]`, feature/pricing/
about pages — all without an account. Search/filter/paginate on the three
catalogs. Empty catalogs show clearly-labelled demo examples.

### 2. Buyer checkout 🟡
Add a beef product to cart (`/cart`), check out → `place_order` creates a
`pending_payment` order (inventory reserved atomically; total from DB). With
Stripe keys set, redirect to Stripe Checkout; on completion the webhook marks
the order `paid` and emails confirmations. Without Stripe, the order is held
`pending_payment` (no fake charge). *Tested:* oversell prevention, DB pricing,
idempotent paid, cancel restores inventory (`dtc_orders_test.sql`). *Needs
infra:* the Stripe redirect + live webhook round-trip.

### 3. Buyer bidding 🟡/✅
On a live auction (`/auctions/[id]`), log in and bid. Server enforces min
increment, anti-self-bid, live/closed, and concurrency (`FOR UPDATE`). "My bids"
at `/bids`. *Tested:* full bid validation + settlement + isolation
(`auction_bidding_test.sql`). *Needs infra:* none for bidding; auto-close needs
a cron hitting `/api/auctions/close-due`.

### 4. Ranch seller signup ✅/🟡
`/signup` → onboarding creates org → dashboard. *Tested:* org resolution +
no-org→onboarding (`context.test.ts`). *Needs infra:* Supabase Auth (email).

### 5. Seller creates listing ✅
`/dashboard/listings/new` → publish (active-listing limit enforced by plan) →
appears on `/listings` and the storefront.

### 6. Seller creates beef product ✅
`/dashboard/listings/meat/new` → appears on `/beef`; inventory + sold-out states
drive cart availability.

### 7. Seller creates auction 🟡/✅
Enterprise plan → `/dashboard/auctions/new` → add lots → Go live → buyers bid →
End sale (or auto-close) settles sold/passed vs reserve. *Tested:* settlement,
cancel, service-role close + winner audit. Gated by entitlement (real paywall).

### 8. AI receptionist setup 🟡
`/dashboard/receptionist`: greeting, FAQ, qualification questions, profile,
publish storefront. Live test panel. *Tested:* prompt building, grounding/
injection guards, contact extraction, entitlement gating. *Needs infra:*
`ANTHROPIC_API_KEY` (without it the route returns a safe fallback reply).

### 9. Public inquiry ✅/🟡
Inquiry form on listing/beef/storefront → creates a lead (service-role boundary,
honeypot + rate-limited) → seller alert + buyer confirmation enqueued.
*Tested:* lead/inquiry isolation; notification templates. *Needs infra:* Resend
for actual email (otherwise recorded `skipped`).

### 10. Seller CRM workflow ✅
Customers/leads/livestock/reminders CRUD; lead → customer conversion; reminders
grouped Overdue/Today/Upcoming; source tracking. *Tested:* helpers + RLS
isolation.

### 11. Admin moderation ✅
`/admin`: users, orgs, listings, products, auctions (cancel), AI conversations,
audit log. Server-side `requirePlatformAdmin` gate. *Tested:* admin actions +
cancel-auth in SQL; platform-admin RLS visibility.

### 12. Billing upgrade 🟡
`/dashboard/billing` → choose plan → Stripe Checkout → webhook syncs
subscription → entitlements unlock (e.g. auctions). *Tested:* plan/price
mapping, entitlement downgrade, webhook signature rejection + idempotency.
*Needs infra:* Stripe keys + price IDs.

### 13. Mobile journey ✅
Mobile header menu (`<details>`, no JS), responsive grids, GET-form filters,
big tap targets. Verified via build + responsive Tailwind classes; not
device-tested here.

### 14. Missing-config environment ✅
Public pages render with demo fallback if Supabase is unreachable. Middleware
fails open (no site-wide 500). Stripe/Resend/Anthropic/Storage absent →
features degrade with honest messaging, never crash.

### 15. RLS / cross-tenant isolation ✅
`rls_isolation_test.sql` + `auction_bidding_test.sql` + `dtc_orders_test.sql`
prove org-scoped reads/writes, buyer-scoped orders/bids, public-vs-private
storefronts, service-role-only money RPCs, and the privilege-escalation guard.

## Known gaps (honest)

- 🟡 **Media (V3)** — validation (tested), rendering with fallback, a public
  Storage-bucket migration, an authorize-then-service-role upload action, and a
  photo manager on listing/product edit pages are all built. Verifying actual
  upload needs the live `media` bucket (the migration creates it).
- 🟡 **Outbid / auction-won emails** — wired end to end: `place_bid` returns the
  outbid bidder (emailed), and winners are emailed on auction close (manual end
  + cron). Delivery needs `RESEND_API_KEY`.
- 🟡 **Email/Stripe/Anthropic/Storage** — wired but require real credentials to
  verify end-to-end; unit/SQL tests cover the surrounding logic.
- 🟡 **Auction auto-close** — route exists; needs a scheduler (Vercel Cron) +
  `CRON_SECRET`. Bids past `closes_at` are already rejected server-side.
