# Supervised Autonomy & Outreach Safety

OpenRange agents operate in autonomy **tiers**. Tier 1 runs freely; Tier 2
(contacting real people) is gated and **disarmed by default**; Tier 3 is never
allowed. The point of this system is to let agents do relationship-first outreach
*safely* — protecting deliverability, trust, and compliance.

## Tiers
- **Tier 1 — fully autonomous (safe):** prospect research, enrichment, scoring,
  CRM organization, dedup, liquidity analysis, **outreach drafting**, follow-up
  planning, onboarding prep, analytics, content/SEO/QA, memory updates. No contact
  with anyone.
- **Tier 2 — semi-autonomous communication (gated):** sending personalized email/
  contact-form outreach, follow-ups, inbound reply handling. **Off by default.**
  Sends only when ALL hold: the agent is **armed**, an email provider is
  configured, and each message passes the send-safety gate. Capped per day.
- **Tier 3 — forbidden:** spam/mass DMs, auto ad spend, fake testimonials/traction/
  ranches, impersonation, scraping prohibited/behind-login sources, auto
  contracts/pricing, auto deploy/delete. Never built, never stored (the DB even
  rejects `tier = 3`).

## Send-safety gate (`agents/lib/send-safety.mjs`, pure + tested)
Before any message can be sent, `canSend()` must pass — otherwise it **holds for
approval**. It checks, in order:
1. **Contact present** and **not on the suppression list** (suppressed = never sent).
2. **No duplicate** of an already-sent body to that contact.
3. **Cooldown** since last contact (default 14 days).
4. **Daily cap** not exceeded (default 10, max 50).
5. **Spam-risk < 40** — `spamRiskScore()` penalizes missing personalization,
   prohibited phrases ("act now", "guaranteed"…), fake-traction claims, AI jargon,
   shouting, excess links.
6. **Personalization** — the message must reference the specific ranch/contact.
7. **Armed** — the agent's `outreach_armed` switch is on.

Only if every check passes does `canSend` return `allowed: true`. Reply handling
(`reply-classify.mjs`) classifies inbound mail and **auto-suppresses on a clear
"no."**

## Pipeline (supervised)
```
prospect (CRM) → drafted outreach (pending_approval)
   → admin approves draft → enqueue → outbound_messages (spam-scored)
      → admin approves the outbound message
         → sender (agents/outreach/send.mjs) sends ONLY if armed + provider + canSend
```
Every step is logged (`outbound_messages`, `agent_runs`); nothing skips the gate.

## Arming checklist (do all before flipping Tier 2 on)
1. Configure a **compliant email domain**: a real sending domain with SPF + DKIM +
   DMARC, `RESEND_API_KEY` set, a valid `From` and physical mailing address, and a
   working unsubscribe — required for CAN-SPAM and deliverability.
2. Load **real, permissibly-contactable prospects** (your list / referrals /
   approved public sources). Never cold-blast harvested addresses.
3. Start with a **low cap** (5–10/day), warm the domain, watch bounces/complaints.
4. In Control Center → **Outreach Ops**, click **Arm** for `growth`.
5. The scheduled sender (`daily-outreach-send.yml`) then sends only what's approved
   + passes the gate, up to the cap. Disarm any time (instant kill-switch).

## Why it ships disarmed
No provider is configured, there are no real prospects loaded, and cold email to
real ranchers from an unwarmed domain damages reputation + risks compliance. The
**capability and guardrails are real**; turning it on is a deliberate human step
once the prerequisites above are met. This is "supervised autonomous," not
"unattended."

## Control Center → Outreach Ops (`/admin/agents/outreach`)
Arm/disarm + cap per agent, outbound queue + send log, spam-risk per message,
suppression management, inbound reply classification, and response analytics.
