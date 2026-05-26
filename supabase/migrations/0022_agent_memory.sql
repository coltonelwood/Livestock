-- 0022 — Agent memory & learning layer.
--
-- Gives the supervised agents persistent, SCOPED, AUDITABLE memory so they
-- improve from real outcomes — without uncontrolled self-learning. Agents read
-- relevant memory before acting and write lessons after; risky changes (playbook
-- updates, paid experiments) still require human approval.
--
-- Safety model (enforced here + in helpers + in app):
--   * Scope on every memory (global | agent | org | user). The retrieval helper
--     NEVER feeds one org's private memory to an agent acting for another org.
--   * Rejected memories are never reused; expired/low-confidence ones drop out.
--   * No secrets/credentials are ever written (write helper redacts + refuses).
--   * All rows are platform-admin only (RLS); agents write via service role.
--   * Admin can approve/reject/pin/edit/delete/export everything.

create table public.agent_memories (
  id            uuid primary key default gen_random_uuid(),
  agent         text,                                  -- null = applies to all agents
  memory_type   text not null,                         -- successful_tactic | failed_tactic | bug_pattern | conversion_insight | brand_rule | ...
  summary       text not null,
  detail        text,
  source        text,                                  -- run id, admin, feedback, experiment
  confidence_score numeric not null default 0.5 check (confidence_score >= 0 and confidence_score <= 1),
  related_entity_type text,
  related_entity_id   text,
  tags          text[] not null default '{}',
  scope         text not null default 'global' check (scope in ('global','agent','org','user')),
  organization_id uuid references public.organizations (id) on delete cascade,
  user_id       uuid references public.profiles (id) on delete set null,
  status        text not null default 'active' check (status in ('active','pending','rejected','archived')),
  pinned        boolean not null default false,
  created_by    uuid references public.profiles (id) on delete set null,  -- null = an agent
  approved_by   uuid references public.profiles (id) on delete set null,
  last_used_at  timestamptz,
  expires_at    timestamptz,                           -- null = permanent
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index agent_memories_lookup_idx on public.agent_memories (agent, status, scope, confidence_score desc, created_at desc);
create index agent_memories_org_idx on public.agent_memories (organization_id);

create table public.agent_lessons (
  id            uuid primary key default gen_random_uuid(),
  agent         text not null,
  category      text not null,                         -- successful_tactic | failed_tactic | bug_pattern | ...
  lesson        text not null,
  confidence_score numeric not null default 0.4 check (confidence_score >= 0 and confidence_score <= 1),
  evidence_count int not null default 1,               -- bumped when the pattern repeats
  tags          text[] not null default '{}',
  status        text not null default 'proposed' check (status in ('proposed','approved','rejected','archived')),
  approved_by   uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index agent_lessons_agent_idx on public.agent_lessons (agent, status, created_at desc);

create table public.agent_decisions (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid references public.agent_runs (id) on delete cascade,
  agent         text not null,
  action        text not null,
  rationale     text,
  memory_ids    uuid[] not null default '{}',          -- which memories informed this (audit of memory used)
  expected_outcome text,
  risk_level    text not null default 'low' check (risk_level in ('low','medium','high')),
  confidence_score numeric default 0.5,
  created_at    timestamptz not null default now()
);
create index agent_decisions_run_idx on public.agent_decisions (run_id);

create table public.agent_feedback (
  id          uuid primary key default gen_random_uuid(),
  agent       text,
  target_type text not null,                            -- memory | lesson | report | recommendation | run
  target_id   uuid,
  rating      text not null check (rating in ('useful','not_useful','partial')),
  notes       text,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index agent_feedback_target_idx on public.agent_feedback (target_type, target_id);

create table public.agent_experiments (
  id            uuid primary key default gen_random_uuid(),
  agent         text not null,
  name          text not null,
  hypothesis    text not null,
  audience      text,
  success_metric text,
  baseline      text,
  requires_spend boolean not null default false,        -- paid experiments cannot start without approval
  status        text not null default 'proposed'
                  check (status in ('proposed','approved','running','complete','adopted','rejected','retest','needs_data')),
  decision      text,
  start_date    date,
  end_date      date,
  approved_by   uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.agent_experiment_results (
  id            uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.agent_experiments (id) on delete cascade,
  variant       text not null,
  metric        text,
  value         numeric,
  sample_size   int,
  notes         text,
  recorded_at   timestamptz not null default now()
);

create table public.agent_playbooks (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  title           text not null,
  objective       text,
  audience        text,
  steps           text,
  approved_angles text[] not null default '{}',
  disallowed_tactics text[] not null default '{}',
  success_metrics text,
  examples        text,
  owner           text,
  version         int not null default 1,
  status          text not null default 'active' check (status in ('draft','active','pending_update','archived')),
  pending_changes jsonb,                                -- a proposed update awaiting approval
  proposed_by     text,                                 -- agent that proposed the pending change
  approved_by     uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.agent_preferences (
  id            uuid primary key default gen_random_uuid(),
  scope         text not null default 'global' check (scope in ('global','agent','org','user')),
  agent         text,
  organization_id uuid references public.organizations (id) on delete cascade,
  user_id       uuid references public.profiles (id) on delete cascade,
  key           text not null,
  value         text not null,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.agent_knowledge_sources (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  url         text,
  kind        text not null default 'manual',           -- approved_source | manual | doc
  allowed     boolean not null default true,             -- false = do NOT scrape/use
  notes       text,
  created_at  timestamptz not null default now()
);

create table public.agent_performance_metrics (
  id          uuid primary key default gen_random_uuid(),
  agent       text not null,
  period      text,                                      -- e.g. 2026-W21
  metric      text not null,                             -- useful_recs | approved | rejected | leads | bugs_found | false_positives | revenue_influenced
  value       numeric not null default 0,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index agent_perf_idx on public.agent_performance_metrics (agent, period);

-- updated_at triggers
create trigger agent_memories_set_updated_at before update on public.agent_memories
  for each row execute function public.set_updated_at();
create trigger agent_lessons_set_updated_at before update on public.agent_lessons
  for each row execute function public.set_updated_at();
create trigger agent_experiments_set_updated_at before update on public.agent_experiments
  for each row execute function public.set_updated_at();
create trigger agent_playbooks_set_updated_at before update on public.agent_playbooks
  for each row execute function public.set_updated_at();
create trigger agent_preferences_set_updated_at before update on public.agent_preferences
  for each row execute function public.set_updated_at();

-- RLS: platform admins manage everything; agents write via the service role.
do $$
declare t text;
begin
  foreach t in array array[
    'agent_memories','agent_lessons','agent_decisions','agent_feedback',
    'agent_experiments','agent_experiment_results','agent_playbooks',
    'agent_preferences','agent_knowledge_sources','agent_performance_metrics'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'create policy %1$s_admin_all on public.%1$I for all using (public.is_platform_admin()) with check (public.is_platform_admin());',
      t
    );
  end loop;
end $$;

-- Seed: a few human-approved global brand rules + starter playbooks so agents
-- have grounding from day one. (No fabricated data — these are our own policies.)
insert into public.agent_memories (agent, memory_type, summary, scope, status, confidence_score, pinned, tags) values
  (null, 'brand_rule', 'Voice is rugged, plain-spoken, Western — for ranchers who work outside. No corporate fluff, no emoji spam, no generic AI-marketing clichés.', 'global', 'active', 1.0, true, '{brand,voice}'),
  (null, 'brand_rule', 'Never fabricate testimonials, reviews, metrics, traction, or activity. Truthful, benefit-led only.', 'global', 'active', 1.0, true, '{brand,trust,safety}'),
  (null, 'brand_rule', 'Prospects come only from approved sources or manual input — never scrape sites that prohibit it.', 'global', 'active', 1.0, true, '{growth,safety}');

insert into public.agent_playbooks (slug, title, objective, audience, steps, success_metrics, owner, status) values
  ('seller-acquisition', 'Seller acquisition', 'Sign up ranches, breeders, auction houses, and beef sellers.', 'Cattle producers & sale operators', '1) Source prospects from approved lists. 2) Personalize outreach template. 3) Human approves + sends. 4) Onboard: profile + first listing. 5) Follow up at 3 and 7 days.', 'replies, signups, first-listing rate', 'growth', 'active'),
  ('content-strategy', 'Content strategy', 'Grow distribution with useful, on-brand content.', 'Ranchers & DTC beef buyers', '1) Mix value posts, explainers, spotlights, market notes. 2) Western voice. 3) No fake stats. 4) Track engagement and feed lessons back.', 'reach, engagement, clicks to listings', 'content', 'active'),
  ('qa-debugging', 'QA & debugging', 'Catch and fix regressions fast.', 'Engineering', '1) Ops Agent runs daily QA. 2) Recurring failures become bug_pattern lessons. 3) Code Agent proposes fixes as PRs with test evidence. 4) Human reviews + merges.', 'time-to-detect, recurrence rate', 'ops', 'active');
