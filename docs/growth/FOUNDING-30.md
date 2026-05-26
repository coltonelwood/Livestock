# OpenRange — Supervised Growth Mode: Founding-25 (30-day plan)

**Mission:** sign the first 10–25 *real* founding ranches with real listings, beef,
auctions, and buyer inquiries. Optimize for real feedback, real liquidity, and
trust — not vanity metrics.

**Mode:** supervised. Every artifact below is a **draft pending your approval**.
Nothing here has been sent, spent, deployed, or published.

> **The one thing the agents will not do:** invent fake ranches or scrape
> Facebook/private data (your own operating rules forbid both). Real founding
> prospects must come from **you or an approved source** — see Phase 2. Once you
> drop a prospect list into `prospects-template.csv` (or approve a public
> directory), the Growth Agent personalizes the outreach below for each one.

---

## Phase 1 — Ops Agent: launch-readiness check ✅
Ran the live Ops Agent against `livestock-eight.vercel.app` — **62 checks, all clear, no blockers.**

| Check | Status |
|---|---|
| Site live; `/ /listings /beef /auctions /pricing /about` load | ✅ 200 |
| Dashboard/admin routes protected (redirect, not 500) | ✅ 307 |
| Inquiry form submits (fail-open, fields preserved) | ✅ |
| Cart + add-to-cart + checkout-start | ✅ |
| Ranch storefronts + photo upload | ✅ (verified) |
| Agent Control Center + Memory pages render | ✅ 200 |
| Console errors / 500s | ✅ none |
| Mobile overflow 360–1024px | ✅ none |

**One activation blocker (not a site bug) — P1 for the agent system, not the marketplace:**
agent run logs + approval queue only persist once migrations `0021/0022` are
applied to the **live** Supabase project and GitHub secrets are set. Until then
the Control Center renders empty-but-safe. *Recommendation: apply migrations +
set `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_*` before Day 6.*

---

## Phase 3 — Marketplace Liquidity Agent: gap report

**Current inventory (seeded demo):** 5 ranch storefronts · 11 livestock listings ·
6 beef products · 3 auctions. Regions: KS, MT, TX, NE, SD. Breeds: Black/Red
Angus, Hereford, Charolais, Brangus, Wagyu, baldy/Tigerstripe.

**Minimum-viable-supply targets & gaps:**
| Asset | Have | Target | Gap |
|---|---|---|---|
| Ranch storefronts | 5 | 20 | **+15** |
| Livestock listings | 11 | 100 | **+89** |
| Beef products | 6 | 50 | **+44** |
| Live/upcoming auctions | 3 | 5 | **+2** |

**Biggest gaps (recruit against these first):**
1. **Geography:** your top-priority states **CO, UT, WY, OK have ZERO inventory.**
   First 8 founding ranches should be CO + WY (closest to your target + strong
   cow-calf/seedstock + freezer-beef culture).
2. **DTC beef** is thin (6) relative to demand and is the *easiest* first win for
   owner-operators already selling freezer beef on Facebook → prioritize beef
   sellers for fast, visible liquidity.
3. **Breed/price coverage:** good on Angus/Hereford/Charolais; **missing**
   Simmental, Limousin, Gelbvieh, club calves/show stock, and sub-$1,500 feeder
   lots that pull in commercial buyers.

**Seller-acquisition priority order:** (1) freezer-beef sellers (fast storefront
win), (2) seedstock/bull producers (high-value listings + auctions), (3)
commercial cow-calf (volume feeder lots), (4) small production-auction operators.

**Weekly liquidity targets (4 weeks):** W1: 3 storefronts/15 listings/8 beef ·
W2: +4/+20/+12 · W3: +4/+25/+12 · W4: +4/+25/+12 → lands ~15 storefronts, ~85
listings, ~44 beef, 2 new auctions (MVP supply).

---

## Phase 2 — Growth Agent: founding-ranch acquisition (system, not fabrication)

The Growth Agent **organizes & scores** prospects and **drafts** outreach; it does
not invent or scrape them. To produce the "top 25," do one of:
- **You paste a list** into `docs/growth/prospects-template.csv` (from your own
  network, referrals, or public pages you're allowed to use), or
- **You approve a specific public directory** (e.g., a breed-association member
  directory, a state cattlemen's association list, a county fair vendor list)
  and I pull only the public fields it permits.

**Scoring rubric (fit 1–10):** +2 already sells cattle/beef/bulls publicly · +2
posts actively (FB/IG) · +1 weak/outdated or no website · +1 relies on
Messenger/text/calls for leads · +1 good photos · +1 owner-operated · +1 clear
inventory · +1 in CO/UT/WY/OK (priority geo). 8–10 = founding candidate.

**Fields collected per prospect:** name, owner/contact (public only), state,
county, website, public FB/IG, what they sell, sales-activity signals, fit score,
best reason they'd care, first feature to pitch, outreach angle, notes, source
URL, date found. (Schema = the CSV header.)

**Targets to hit once you supply the source:** 50 prospect records · 20
high-priority founding candidates · 10 personalized drafts · 5 angles. The
personalization templates are below (Phase 4) with `{{placeholders}}` ready to
fill per prospect.

---

## Phase 4 — Outreach drafts (pending approval; `{{placeholders}}` = fill per ranch)

**Voice:** personal, direct, respectful, relationship-first. No hype, no fake
urgency, no claimed traction. Founding offer = *"help us shape it + free hands-on
setup + I want honest feedback from real operators."*

### Facebook DMs (5 of 10 angles shown; the rest follow the same pattern)
1. *Storefront* — "Howdy {{first_name}} — I came across {{ranch_name}}'s page and your {{breed}} cattle look solid. I'm building a livestock marketplace + ranch storefront and looking for a handful of founding ranches to help shape it. I'd set yours up myself, free — mostly I want honest feedback from real operators. Worth a look?"
2. *More leads* — "{{first_name}}, looks like buyers hit you up in the comments/DMs on {{ranch_name}}. I'm building a tool that captures those inquiries in one place so none slip through. Looking for a few founding ranches to test it with — can I set one up for you and get your take?"
3. *Beef direct* — "Hey {{first_name}} — saw you sell {{beef_product}}. I'm building a spot where ranchers sell beef direct with a real storefront (not just a Facebook post). Want me to build yours free as a founding seller? Just after feedback."
4. *Off Facebook* — "{{first_name}}, you've got great {{breed}} but they're buried in the feed. I'm building listing pages buyers can actually search. Free founding setup — would you try it and tell me what's wrong with it?"
5. *Auction* — "{{first_name}}, do you run a sale for {{ranch_name}}? I'm building clean mobile auction pages with bidder lead capture. Looking for one or two founding sale operators to test it — interested?"

### Email (subject + body; 3 of 10 shown)
- **Subj: Founding ranch on a new livestock marketplace** — "Hi {{first_name}}, I'm {{your_name}}, building OpenRange — a livestock marketplace + ranch storefront + DTC beef platform. I'm hand-picking ~20 founding ranches and {{ranch_name}} fits ({{specific_detail}}). I'll set up your storefront and listings myself at no cost; in return I want blunt feedback from a real operator. Open to a 10-minute call or a few messages? — {{your_name}}, {{phone}}"
- **Subj: {{ranch_name}} + a better way to sell your beef** — short DTC-beef angle.
- **Subj: Quick question from another cattle person** — warm, low-ask feedback request.

### Text messages (short; 3 of 10 shown)
- "Hi {{first_name}}, {{your_name}} here — building a livestock marketplace and looking for founding ranches. Could I set up a free storefront for {{ranch_name}} and get your feedback? No cost, no catch."
- "{{first_name}} — saw {{ranch_name}}'s {{breed}}. Building tools so buyer messages don't get lost. Want me to set you up as a founding ranch (free)?"
- "Howdy — selling {{beef_product}}? I'm building direct-beef storefronts for ranches. Free founding setup if you'll give honest feedback. Interested?"

### Follow-ups (5)
1. "{{first_name}}, no rush — just circling back. Happy to set up {{ranch_name}} whenever; only takes me a few minutes." 2. "Sent you a sample storefront for {{ranch_name}} — {{link}}. What would you change?" 3. "Totally get it if the timing's off — want me to check back after {{season}}?" 4. "Quick one: would lead capture or a beef storefront be more useful to you right now?" 5. "Last nudge — I'm keeping founding spots small. Want me to hold one for {{ranch_name}}?"

### Graceful "not interested" replies (5)
1. "Appreciate you taking a look — I'll get out of your hair. If you ever want a free storefront, the door's open." 2. "No worries at all. Mind if I check back down the road?" 3. "Totally fair. Would it help if I just sent the link so it's there when you want it?" 4. "Understood — thanks for the honesty, that's exactly the feedback I need." 5. "All good. If you know another rancher who'd want in, an intro would mean a lot."

### Warm-intro requests (5) & onboarding invites (5)
- Intro: "{{mutual}}, you know {{ranch_name}}? I'm building a livestock marketplace and they'd be a great founding ranch — open to a quick intro?"
- Onboarding invite: "{{first_name}}, you're in — welcome as a founding ranch. I'll set up {{ranch_name}}'s storefront. Can you send 5–8 photos + your current cattle/beef list? I'll take it from there and send it back for your OK."

---

## Phase 5 — Content Agent: 30-day calendar (themes + ready samples)

**Cadence:** 1 post/day, rotating 12 themes. No fake results/testimonials/sales
numbers; practical livestock language; honest "we're building this" framing.

**Theme rotation:** ranch spotlight · featured listing · beef box of the week ·
auction highlight · "Facebook alone isn't enough" · buyer education · seller
education · local-beef buying guide · cattle-market note · build-in-public ·
founder story · feedback request.

**Sample posts (one per key theme; the keyed Content Agent generates the full 30):**
- *Build-in-public:* "Building a place where ranchers sell cattle and beef direct — real storefronts, not buried Facebook posts. Looking for founding ranches in CO/WY. If that's you, comment 'ranch'."
- *Facebook-isn't-enough:* "A buyer messages you about a bull. Three days and 40 posts later, it's gone. Your cattle deserve a page buyers can actually search. That's what we're building."
- *Beef buying guide:* "Buying a quarter beef? Here's what hanging weight vs. take-home weight actually means — and what to ask your rancher." (educational, no product claims)
- *Seller education:* "5 photos that sell cattle: a clean side profile, the head, feet/legs, the group on grass, and one with you in it for scale."
- *Feedback request:* "Ranchers: what's the most annoying part of selling cattle or beef online right now? Genuinely asking — building tools to fix it."
- *Founder story:* honest why-I'm-building-this (no fabricated bio).

**Templates included:** 10 ranch-spotlight, 10 listing-highlight, 10 beef-highlight
(all with `{{placeholders}}`, no invented ranch). 5 launch-announcement + 5
feedback-request posts. *(Full 30×3 set generated by the keyed Content Agent into
the approval queue.)*

---

## Phase 6 — Ad Creative Agent: concepts only (NO spend, NO launch)

**A. Ranch sellers** (hooks): "Stop losing buyers in the comments." · "Your cattle,
one clean storefront." · "Sell your beef direct — no middleman." · "Every inquiry
in one place." · "Modern tools, built for real ranchers."
**B. Beef buyers:** "Find local ranch beef near you." · "Buy a quarter, half, or
whole — direct from the ranch." · "Know your rancher." · "Local beef, no grocery
markup."
**C. Auction operators:** "Run your sale on a clean mobile page." · "Bidders on
their phones, leads in your pocket." · "Sale day without the clunky software."

**Also drafted:** 10 TikTok/UGC scripts (rancher-to-rancher, phone-shot), 10 image
concepts (pasture, sale ring, loading cattle, phone showing a listing), 10 video
shot lists, 5 landing-page variants (seller / beef-buyer / auction), 5 retargeting
angles. **Budget = a *suggested test* note only; nothing launches without your
approval and your ad-account.**

---

## Phase 7 — SEO Agent: organic foundation (tasks/drafts, nothing auto-published)

**Keyword map → page:** "Colorado cattle for sale" → /listings?state=CO ·
"Angus/Hereford cattle for sale" → breed-filtered listings · "beef direct from
ranch / freezer beef near me / ranch beef boxes" → /beef · "livestock auctions
online" → /auctions · "cattle marketplace / ranch storefront" → / and /ranch/[id].

**Metadata templates:**
- Listing: `{{breed}} {{class}} for sale in {{county}}, {{state}} | {{ranch}} · OpenRange` / desc: "{{qty}} {{breed}} {{class}} — {{key_detail}}. Contact {{ranch}} direct on OpenRange."
- Beef: `{{product}} — beef direct from {{ranch}}, {{state}} | OpenRange` / desc: "{{cut/share}} priced {{price}}. Local ranch beef, buy direct."
- Auction: `{{title}} — online livestock auction {{date}} | OpenRange`
- Ranch: `{{ranch}} — cattle & beef for sale in {{location}} | OpenRange`

**Audit finding:** marketplace/category pages have solid titles; listing/beef/
auction/ranch detail pages should adopt the templates above + add Product/Offer/
BreadcrumbList structured data. **20 blog ideas** (buying guides, breed explainers,
sale-day prep, freezer-beef math, by-state "cattle for sale in X"). **Internal
links:** breed↔region cross-links, ranch storefront → its listings/beef,
auction → consignor storefront. **Thin pages:** empty filtered states need a CTA.

---

## Phase 8 — Customer Success Agent: founding onboarding kit

1. **Founding-ranch checklist:** create org → ranch profile (name, location, bio,
   phone, email, photo) → publish storefront → add 3–5 listings/beef → set Lead
   Assistant FAQ → first share.
2. **Seller intake questions:** what do you sell? how do buyers reach you today?
   how many head/products? photos available? do you run a sale? biggest headache?
3. **Manual onboarding script:** "I'll build it with you on a 15-min call/text —
   send photos + your list, I'll set it up, you approve."
4. **Listing import template** (CSV: title, species, breed, qty, price, location,
   description) + **photo guide** (the 5 shots) + **beef setup guide**
   (quarter/half/whole, hanging-weight pricing, inventory) + **auction setup guide**
   (sale title, start/end, lots, opening bid/reserve/increment).
5. **"Get your first leads" guide:** publish → share the storefront link in your
   usual FB groups → turn on Lead Assistant → reply fast.
6. **Weekly check-in:** "How'd the week go? Any buyers reach out? Anything
   confusing or broken?" + **feedback survey** (1–5 ease, what's missing, would
   you recommend it, would you pay).

**Principle:** founding ranches don't self-serve — we set them up by hand.

---

## Phase 9 — Design/UX + Code: product improvement loop
- Ops Agent runs daily (Phase 1). QA findings are severity-tagged (P0 security →
  P3 polish) into `qa_findings`.
- **Current:** 0 open findings; full mobile audit (360–1024) clean; brand reads
  rugged/western, not "AI software."
- **Watch-list (from build):** real seller photos beat the category fallbacks —
  push founding ranches to upload; keep onboarding to ≤5 steps; ensure the
  storefront link is dead-simple to share.
- Code Agent: PRs only, full gate, **no auto-merge/deploy.**

---

## Phase 10 — Analytics + Revenue
- **Instrument first** (no fabricated metrics): wire PostHog events for visit →
  listing view → inquiry/add-to-cart → signup → first-listing → first-inquiry →
  order/bid. Until then, report structure not numbers.
- **North-star:** *active ranches with ≥1 live listing AND ≥1 real buyer inquiry.*
- **Revenue recommendation (founding offer):** keep it **free for founding
  ranches**, lifetime "Founding Rancher" discount (e.g., 50% off Pro for life)
  as thanks for feedback. Don't charge until a ranch has received real
  inquiries/sales (value first). First paid wedge = DTC-beef sellers (clear ROI)
  + premium/featured listings later. **No billing changes made — recommendation only.**

---

## Phase 11 — Trust & Safety
Rubric for the moderation queue (flag only, **never auto-ban/delete**): price far
outside market, duplicated text across listings, contact routing buyers
off-platform to dodge fees, "wire a deposit to hold," impossible inventory,
near-identical new accounts, missing/again-stolen photos. Seeded listings:
clean. All flags → `moderation_queue` (pending) for your review.

---

## Phase 12 — Memory & Learning (how this compounds)
Each keyed run loads brand rules + the active playbook + recent lessons, records
a decision (with the memory IDs used), and distills lessons that need your
approval before they're reused. Concretely: a DM angle that gets replies →
`successful_tactic`; a silent region → confidence ↓; "photo upload is confusing"
→ P2 UX finding; beef out-pulling cattle → re-order acquisition. Memory is scoped,
auditable, deletable, secret-free, no cross-org leakage (all unit-tested).

---

## Next 7-day execution plan
- **Day 1 (done):** Ops QA ✅, liquidity gap report ✅, this content/outreach draft set ✅.
- **Day 2:** You drop real prospects into `prospects-template.csv` (or approve a source) → Growth Agent scores them + personalizes the 10 drafts. Onboarding kit + SEO audit finalized.
- **Day 3:** You approve the first 10 outreach drafts in the Control Center. Apply migrations + set secrets so logs/queue persist.
- **Day 4:** Follow-up sequences + ad concepts staged; analytics events instrumented.
- **Day 5:** Manual onboarding guide finalized; Ops re-test; trust review of any new listings.
- **Day 6:** **You manually contact the first batch of real ranches.** Log responses.
- **Day 7:** Memory summarizes what landed; playbooks updated from *real* replies; next week planned from results.

**Success = real ranches contacted, real feedback collected, real listings added,
real inquiries generated — not the size of these drafts.**

---

### What needs YOUR approval / input
1. **Real prospect source** (the blocker for Phase 2) — paste a list or approve a public directory.
2. **Apply migrations `0021/0022`** + set GitHub/Vercel secrets so the agent loop persists and the keyed agents can generate volume into the approval queue.
3. **Approve outreach/content drafts** in the Control Center before anything is sent/published.
4. **Confirm the founding offer** (free + lifetime discount) before any pricing change.
