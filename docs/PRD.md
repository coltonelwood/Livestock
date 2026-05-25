# OpenRange — Product Requirements Document

> The operating system for modern ranching and livestock commerce.

## 1. Vision

Ranchers, breeders, sale barns, haulers, processors, and rural vets/feed stores
run their businesses on a patchwork of phone calls, text messages, Facebook
groups, paper records, and sale-day chaos. OpenRange unifies the **front office**
(receptionist + CRM + leads) and the **commerce layer** (marketplace, auctions,
direct-to-consumer beef, transport, payments) into one multi-tenant platform.

## 2. Target users (personas)

| Persona | Pain today | OpenRange wedge |
| --- | --- | --- |
| Cow-calf / seedstock rancher | Misses buyer calls while working cattle | AI receptionist + CRM |
| Registered breeder | Manages genetics & sales in spreadsheets | Listings + CRM |
| Auction house / sale barn | Manual consignment & buyer comms | Auctions + receptionist |
| Hauler | Finds loads via word of mouth | Transport load board |
| Processor / locker | Scheduling via phone tag | Receptionist + orders |
| Vet / feed store | No lead capture from website | Receptionist + CRM |
| Beef buyer (consumer) | Hard to buy direct from ranch | D2C storefronts |

## 3. Goals & non-goals

**Phase 1 goals**
- Multi-tenant SaaS shell with real auth and organizations.
- First revenue wedge: AI receptionist (web chat) + CRM + listings.
- Production-quality foundation: RLS, migrations, tests, security baseline.

**Non-goals (Phase 1)**
- Live payment capture, escrow settlement.
- Real-time auction bidding engine.
- Native mobile apps (web is mobile-first/PWA-ready).
- Outbound SMS/voice calling (architecture only).

## 4. Functional requirements (Phase 1)

### A. Marketing site
Homepage, pricing, how-it-works, ranchers, breeders, auction-houses, beef
(D2C), contact/demo. Mobile-first, fast, SEO-friendly.

### B. Auth & onboarding
Email/password + magic-link via Supabase Auth. After first login the user
creates an **organization**, picks a **business type**, and fills a ranch/
business profile. A user may belong to multiple orgs.

### C. Dashboard
Overview KPIs, leads, conversations, listings, customers, AI receptionist
setup, marketplace preview, billing placeholder.

### D. Ranch CRM
Customers, leads, notes, livestock/animal records, reminders, documents.

### E. Listings MVP
Create livestock listing or D2C meat product; public listing pages; inquiry
forms that capture leads automatically.

### F. AI receptionist MVP
Website chat assistant backed by Claude. Stores conversations + messages,
qualifies leads against a configurable script, auto-creates leads, and uses
the org's business FAQ/profile as context. SMS/voice schema prepared.

### G. Admin dashboard
Platform staff view of users, organizations, listings, reports, and a
moderation queue.

## 5. Roles & permissions

- **Platform roles:** `user`, `platform_admin`.
- **Org roles** (`organization_members.role`): `owner`, `admin`, `member`.
- Tenancy is enforced at the database via RLS on `organization_id`.

## 6. Success metrics

- Activation: % of signups that create an org + first listing.
- Receptionist: # conversations → # auto-created leads (capture rate).
- Commerce: # listings, # inquiries, time-to-first-lead.

## 7. Phasing

- **Phase 1 (this build):** shell + receptionist + CRM + listings.
- **Phase 2:** Stripe billing, orders/checkout for D2C beef, storefronts.
- **Phase 3:** auctions engine, transport load board, SMS/voice receptionist.
- **Phase 4:** market intelligence, AI marketing engine, verification/escrow.
