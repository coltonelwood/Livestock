# OpenRange — Deployment Checklist

Target: **Vercel** (Next.js) + **Supabase** (Postgres/Auth/Storage).

## 1. Supabase project

- ☐ Create the Supabase project; note the project ref, URL, anon key, and
  service-role key.
- ☐ Apply migrations in order: `supabase db push` (after `supabase link`) or
  paste `supabase/migrations/*.sql` into the SQL editor sequentially.
- ☐ Verify RLS is enabled on every table (it is created enabled by the
  migrations) and spot-check policies.
- ☐ Configure Auth: email provider, redirect URLs
  (`https://<domain>/auth/callback`), site URL, password policy.
- ☐ (Optional) Regenerate typed defs:
  `npx supabase gen types typescript --project-id <id> > src/lib/db/types.gen.ts`
  and switch the `Database` import.
- ☐ Set up automated backups / PITR.

## 2. Environment variables (Vercel project settings)

Required:
- ☐ `NEXT_PUBLIC_SUPABASE_URL`
- ☐ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ☐ `SUPABASE_SERVICE_ROLE_KEY` (server only — never exposed)
- ☐ `ANTHROPIC_API_KEY`
- ☐ `NEXT_PUBLIC_APP_URL` (production URL)
- ☐ `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (durable rate
  limiting). **Without these, public AI endpoints fail closed (deny).**

Billing (Stripe) — optional; without it orgs stay on the free tier:
- ☐ `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- ☐ `STRIPE_STARTER_PRICE_ID`, `STRIPE_PRO_PRICE_ID`,
  `STRIPE_ENTERPRISE_PRICE_ID`
- ☐ Create the three recurring products/prices in Stripe (live mode for prod).
- ☐ Register the webhook endpoint `https://<domain>/api/stripe/webhook` for
  events: `checkout.session.completed`, `customer.subscription.created/updated/
  deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`. Copy its
  signing secret into `STRIPE_WEBHOOK_SECRET`.

Optional / later phases:
- ☐ `ANTHROPIC_MODEL` (defaults to a current Claude model)
- ☐ `STRIPE_*`, `TWILIO_*`, `NEXT_PUBLIC_POSTHOG_*`

Set each for Production (and Preview if used). Never commit real values.

## 3. Build & deploy

- ☐ Connect the GitHub repo to Vercel; framework preset = Next.js.
- ☐ Confirm `npm run build` passes locally and in CI.
- ☐ Confirm `npm run lint`, `npm run typecheck`, and `npm test` pass in CI.
- ☐ Run the RLS harness (`supabase/tests/run-local.sh`) in CI.
- ☐ Deploy; verify the middleware runs (auth redirects work).

## 4. Smoke test in production

- ☐ Sign up → onboarding → create org → land on dashboard.
- ☐ Create a customer, lead, livestock record, reminder.
- ☐ Create & publish a livestock listing and a beef product.
- ☐ Open the public listing page; submit an inquiry → lead appears in CRM.
- ☐ Chat with the receptionist on a listing; confirm conversation + lead are
  stored and the reply is sane.
- ☐ Grant yourself `platform_admin`; verify `/admin` loads and moderation works.
- ☐ Submit the contact form; confirm it lands in `contact_requests`.
- ☐ Hammer the public chat from one IP; confirm it returns HTTP 429 with a
  `Retry-After` header once the limit is hit.
- ☐ Subscribe to a plan via Checkout (test card `4242…`); confirm the webhook
  updates the org's plan/status, the billing page reflects it, and gated
  features unlock (e.g. publishing more than 5 listings on Pro, auctions on
  Enterprise). Then open the Customer Portal via **Manage billing**.

## 5. Hardening before real traffic

- ☐ Create an Upstash Redis database and set `UPSTASH_REDIS_REST_URL` /
  `UPSTASH_REDIS_REST_TOKEN`; verify chat/inquiry/contact rate limiting works
  (durable limiter is implemented in `src/lib/ratelimit.ts`).
- ☐ Add alerting on Redis availability (public endpoints fail closed without it).
- ☐ Set security headers (CSP/HSTS) and review the API route's CORS.
- ☐ Configure AI spend alerts and a per-org usage cap.
- ☐ Configure Storage bucket policies before enabling document uploads.
- ☐ Set up error monitoring (e.g. Sentry) and analytics (PostHog).

## 6. Rollback

- ☐ Each migration is additive and ordered; keep a reverse plan for
  destructive changes.
- ☐ Use Vercel's instant rollback to a previous deployment if needed.
