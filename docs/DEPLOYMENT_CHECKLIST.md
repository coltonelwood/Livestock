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

## 5. Hardening before real traffic

- ☐ Add a durable rate limiter for `/api/receptionist/chat` and public forms.
- ☐ Set security headers (CSP/HSTS) and review the API route's CORS.
- ☐ Configure AI spend alerts and a per-org usage cap.
- ☐ Configure Storage bucket policies before enabling document uploads.
- ☐ Set up error monitoring (e.g. Sentry) and analytics (PostHog).

## 6. Rollback

- ☐ Each migration is additive and ordered; keep a reverse plan for
  destructive changes.
- ☐ Use Vercel's instant rollback to a previous deployment if needed.
