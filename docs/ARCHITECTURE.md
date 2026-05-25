# OpenRange — System Architecture

## 1. Shape: modular monolith on Next.js + Supabase

A single Next.js (App Router) application is internally split into **modules**
with explicit boundaries. Supabase provides Postgres, Auth, Storage, and
Realtime. This keeps Phase 1 simple to operate while leaving clean seams to
extract services later (e.g. a dedicated auctions service in Phase 3).

```
                     ┌──────────────────────────────────────┐
   Browser / mobile  │            Next.js (Vercel)           │
   ────────────────► │  ┌─────────────┐   ┌───────────────┐  │
                     │  │ Server      │   │ Route Handlers│  │
                     │  │ Components  │   │ /api/*        │  │
                     │  │ + Actions   │   │ (chat, hooks) │  │
                     │  └──────┬──────┘   └───────┬───────┘  │
                     └─────────┼──────────────────┼──────────┘
                               │ @supabase/ssr     │ service role (trusted)
                               ▼                   ▼
                     ┌──────────────────────────────────────┐
                     │              Supabase                 │
                     │  Postgres (RLS) · Auth · Storage      │
                     └──────────────────────────────────────┘
                               │
        external:  Anthropic Claude · Stripe* · Twilio/Telnyx* · PostHog*
                                              (* Phase 2+ placeholders)
```

## 2. Module boundaries

```
src/
  app/                       # routing only (route groups + thin pages)
    (marketing)/             # public site
    (auth)/                  # login, signup, onboarding
    (app)/                   # authenticated dashboard + CRM + listings
    admin/                   # platform admin
    listings/                # PUBLIC listing pages (no auth)
    api/                     # route handlers (AI chat, webhooks)
  modules/
    marketing/               # marketing UI + copy
    auth/                    # auth + onboarding actions/forms
    organizations/           # tenant model, membership, current-org context
    crm/                     # customers, leads, notes, livestock, reminders, docs
    listings/                # livestock listings, meat products, inquiries
    receptionist/            # AI chat, conversations, lead capture
    admin/                   # admin views
    billing/                 # subscriptions (placeholder, Stripe-ready)
  lib/
    supabase/                # browser/server/admin clients (@supabase/ssr)
    auth/                    # session helpers, requireUser/requireOrg
    db/                      # generated types, query helpers
    ai/                      # Claude client + receptionist prompt building
    validation/              # zod schemas shared client+server
  components/ui/             # shadcn-style design system primitives
```

**Rule:** modules depend on `lib/` and on each other only through exported
server actions / typed functions — never by importing another module's
internal files. Cross-tenant data never crosses a boundary without an
`organization_id` scope.

## 3. Request & tenancy flow

1. `@supabase/ssr` middleware refreshes the auth cookie on every request.
2. Server code calls `requireUser()` → resolves the Supabase session.
3. `requireOrg()` resolves the **current organization** from the user's
   memberships (cookie-selected, validated against `organization_members`).
   The client never sends a raw org id that is trusted; it is always checked.
4. All data access goes through the per-request Supabase client, so **RLS is
   the final authority** even if app code has a bug.

## 4. Trust boundaries

- **Browser client** (`anon` key): only ever sees RLS-filtered rows.
- **Server (per-user)**: acts as the logged-in user; RLS applies.
- **Server (service role)**: bypasses RLS. Used ONLY for admin tooling and
  trusted webhooks, never in code reachable by normal user input.
- **Public endpoints** (listing inquiry, web chat): unauthenticated writes are
  constrained by narrow RLS INSERT policies + validation + rate limiting.

## 5. AI receptionist data flow

```
visitor ──chat──► /api/receptionist/chat (route handler)
   │  1. validate + rate-limit
   │  2. load org public profile + FAQ + agent config
   │  3. upsert conversation, persist visitor message
   │  4. call Claude with system prompt (org context + qualification script)
   │  5. persist assistant message + ai_interaction (tokens, latency)
   │  6. heuristics/structured output → create/update lead
   └─► returns assistant reply
```

The system prompt is assembled server-side; visitor input is treated as
untrusted and never interpolated into instructions verbatim.

## 6. Key technology decisions

- **Next.js App Router + Server Actions** for forms/mutations (less API glue).
- **@supabase/ssr** for cookie-based auth across RSC/route handlers.
- **RLS-first** authorization: the DB enforces tenancy; app code is a
  convenience layer, not the security boundary.
- **shadcn/ui + Tailwind**, native form controls, minimal client JS for rural
  low-bandwidth devices.
- **zod** schemas shared between client and server for one source of truth.
