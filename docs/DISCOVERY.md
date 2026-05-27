# OpenRange Discovery Connectors — Runbook

Scalable prospect discovery from **official, licensed APIs only**. This layer
lets the stack find real ranch/beef businesses at volume without scraping,
without bypassing robots/TOS, and without fabricating anything. Every finding
is **staged for human review** — discovery never contacts anyone.

## How it works

```
discovery_source_policies   what a source type may store + whether enrichment is allowed
discovery_sources           a concrete configured source (queries, daily cap, approval state)
discovery_runs              one governed search execution (status + summary counts)
discovery_results           individual findings (staged / duplicate / rejected), auditable
```

A source can **run only if all four hold** (`canRunSource`, enforced in
`runDiscoveryAction`):

1. `approved_by_admin` — an admin attested terms allow use + robots checked
2. `allowed_by_terms` — terms confirmed
3. `enabled`
4. under `rate_limit_per_day` for the current UTC day

If any fails, the run is recorded as **blocked** with the reason; nothing is
fetched. A missing API key also blocks the run.

Findings are normalized to allowed fields only, deduped against existing
prospects and prior results (by place id and by name+state), scored with the
shared `scoreProspect`, and written to `discovery_results`. Promoting a result
creates a `founding_prospects` row at stage **discovered** (optionally enriched
from the business's own website via the robots-aware single-URL extractor, only
if the policy's `allow_extractor` is true).

## 1. Apply the migration

Apply `supabase/migrations/0025_discovery_connectors.sql` via your normal path
(`supabase db push` or the SQL editor). It seeds:

- a `google_places` **policy** (allowed fields + `allow_extractor = true`), and
- a `google_places` **source** that ships **disabled, unapproved, terms
  unconfirmed** with a starter set of CO/WY/UT freezer-beef + cattle queries.

## 2. Add a Google Places API key

The connector uses the official **Places API (New) Text Search** endpoint
(`https://places.googleapis.com/v1/places:searchText`). Get a key from the
Google Cloud console with the Places API enabled, then set it where the server
action runs:

```
GOOGLE_PLACES_API_KEY=...        # Vercel Production env (and any preview that should run discovery)
```

Without the key, runs are blocked with reason `missing_api_key` — by design.

## 3. Approve + enable the source

In **Admin → Agents → Discovery**:

1. Confirm the source's terms link and allowed fields.
2. Click **Approve** (this attests terms allow use and robots was checked).
3. Click **Enable**.

The source's badge flips to **ready to run** once approved + terms + enabled and
it's under the daily cap.

## 4. Run discovery

Use the per-source **Run discovery** form (the default query is prefilled from
the source config; edit it freely). The run:

- calls the official API,
- stages findings into the **Review queue**,
- records a run summary (staged / duplicates / rejected / high-fit),
- and updates the source's `last_run_at`.

Each run counts against `rate_limit_per_day`.

## 5. Review → promote or reject

In the **Review queue**, each staged finding can be:

- **Promoted** → becomes a `founding_prospects` row at stage `discovered`
  (deduped; enriched from its own website if the policy allows), or
- **Rejected** → marked `rejected_by_admin`, kept for audit.

From there it flows through the normal Founding Pipeline (review → approve →
draft outreach → ...). Outreach is still drafted for approval and never sent
automatically.

## Compliance guarantees

- **Official APIs only.** No scraping of search/Maps UIs or behind-login content.
- **Only allowed fields are stored** (per the source policy).
- **Attribution preserved** (`source`, `source_id` = place id).
- **Discovery never contacts anyone** — it only stages data for review.
- **Governed**: a source cannot run until an admin approves it, confirms terms,
  enables it, and it's under its daily cap.

## Tests

`src/lib/agents/discovery.test.ts` covers governance, normalization (allowed
fields + state parsing), dedup (place id + name/state, including against
existing prospects), invalid rejection, extractor eligibility, the
"staged not contacted" posture, run summarization, and the API client
(missing key / API error / successful parse via an injected fetch). Logic lives
in `agents/lib/discovery.mjs`.
