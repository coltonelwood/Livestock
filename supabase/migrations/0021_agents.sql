-- 0021 — Supervised agent operations system.
--
-- Tables that back the OpenRange "AI operations team": run logs, proposed tasks,
-- QA findings, growth/outreach/content/ad drafts, analytics, SEO, moderation,
-- churn, and optimization suggestions.
--
-- SAFETY MODEL (enforced here + in app code + in workflows):
--   * Agents only ever WRITE drafts/findings/suggestions. Anything that sends a
--     message, spends money, merges code, deploys, deletes prod data, or bans a
--     user is gated behind an explicit human approval (status columns below) and
--     is performed by a separate, human-triggered action — never by an agent.
--   * All rows are written by trusted server/CI code via the service role.
--   * Read/manage access is PLATFORM ADMIN ONLY (these contain cross-org data).

-- Reusable status vocabulary (kept as text + checks, matching the codebase style).

create table public.agent_runs (
  id            uuid primary key default gen_random_uuid(),
  agent         text not null,                       -- ops | code | growth | content | ...
  trigger       text not null default 'schedule',    -- schedule | manual | webhook
  status        text not null default 'running'
                  check (status in ('running','success','failed','partial')),
  summary       text,
  stats         jsonb not null default '{}'::jsonb,
  error         text,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz
);
create index agent_runs_agent_idx on public.agent_runs (agent, started_at desc);

create table public.agent_tasks (
  id             uuid primary key default gen_random_uuid(),
  run_id         uuid references public.agent_runs (id) on delete set null,
  agent          text not null,
  title          text not null,
  detail         text,
  priority       text not null default 'normal'
                   check (priority in ('low','normal','high','urgent')),
  -- Approval gate: nothing acts on a task until an admin approves it.
  status         text not null default 'proposed'
                   check (status in ('proposed','approved','rejected','in_progress','done')),
  payload        jsonb not null default '{}'::jsonb,
  github_issue_url text,
  github_pr_url    text,
  approved_by    uuid references public.profiles (id) on delete set null,
  approved_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index agent_tasks_status_idx on public.agent_tasks (status, created_at desc);

create table public.qa_findings (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid references public.agent_runs (id) on delete cascade,
  severity     text not null default 'medium'
                 check (severity in ('info','low','medium','high','critical')),
  area         text not null,                         -- route | console | network | link | form | mobile | auction | order
  route        text,
  title        text not null,
  detail       text,
  screenshot_url text,
  status       text not null default 'open'
                 check (status in ('open','acknowledged','resolved','ignored')),
  github_issue_url text,
  created_at   timestamptz not null default now()
);
create index qa_findings_status_idx on public.qa_findings (status, severity, created_at desc);

create table public.growth_leads (
  id            uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name  text,
  email         text,
  phone         text,
  website       text,
  region        text,
  category      text not null default 'ranch'
                  check (category in ('ranch','breeder','auction_house','beef_seller','other')),
  source        text,                                 -- where the prospect came from (approved source / manual)
  status        text not null default 'new'
                  check (status in ('new','qualified','contacted','converted','rejected')),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index growth_leads_status_idx on public.growth_leads (status, created_at desc);

create table public.outreach_drafts (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid references public.growth_leads (id) on delete cascade,
  channel     text not null default 'email'
                check (channel in ('email','sms','social_dm','mail')),
  subject     text,
  body        text not null,
  -- Cold outreach is NEVER auto-sent. Stays pending until an admin approves,
  -- and even then sending is a separate human-triggered action.
  status      text not null default 'pending_approval'
                check (status in ('pending_approval','approved','rejected','sent')),
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index outreach_drafts_status_idx on public.outreach_drafts (status, created_at desc);

create table public.content_drafts (
  id           uuid primary key default gen_random_uuid(),
  platform     text not null default 'facebook'
                 check (platform in ('facebook','instagram','tiktok','x','youtube','email','blog')),
  kind         text not null default 'post',          -- post | caption | script | spotlight | newsletter | market_report
  title        text,
  body         text not null,
  status       text not null default 'draft'
                 check (status in ('draft','pending_approval','approved','scheduled','published','rejected')),
  scheduled_for timestamptz,
  created_at   timestamptz not null default now()
);
create index content_drafts_status_idx on public.content_drafts (status, created_at desc);

create table public.ad_campaign_drafts (
  id          uuid primary key default gen_random_uuid(),
  platform    text not null
                check (platform in ('facebook','instagram','tiktok','google','youtube')),
  objective   text,                                   -- seller_acq | buyer_acq | retargeting | awareness
  concept     text not null,
  copy        text,
  shot_list   text,
  budget_note text,                                   -- proposed budget; NEVER spent automatically
  status      text not null default 'draft'
                check (status in ('draft','pending_approval','approved','rejected')),
  created_at  timestamptz not null default now()
);

create table public.analytics_reports (
  id         uuid primary key default gen_random_uuid(),
  period     text,                                    -- e.g. 2026-W21 | 2026-05
  kind       text not null default 'weekly_exec',
  title      text not null,
  body       text not null,                           -- markdown
  metrics    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.seo_tasks (
  id             uuid primary key default gen_random_uuid(),
  target_type    text not null,                       -- listing | product | auction | ranch | page | blog
  target_id      text,
  title          text not null,
  recommendation text not null,
  status         text not null default 'proposed'
                   check (status in ('proposed','approved','done','rejected')),
  created_at     timestamptz not null default now()
);

create table public.moderation_queue (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null,                          -- listing | product | auction | account | upload | message
  entity_id   text,
  organization_id uuid references public.organizations (id) on delete set null,
  reason      text not null,
  severity    text not null default 'medium'
                check (severity in ('low','medium','high','critical')),
  -- Agents only flag. Bans/removals require explicit admin approval.
  status      text not null default 'pending'
                check (status in ('pending','approved_action','dismissed')),
  notes       text,
  created_at  timestamptz not null default now()
);
create index moderation_queue_status_idx on public.moderation_queue (status, created_at desc);

create table public.churn_risks (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  risk_level      text not null default 'medium'
                    check (risk_level in ('low','medium','high')),
  signals         jsonb not null default '{}'::jsonb,
  recommended_action text,
  status          text not null default 'open'
                    check (status in ('open','actioned','resolved','ignored')),
  created_at      timestamptz not null default now()
);

create table public.optimization_suggestions (
  id              uuid primary key default gen_random_uuid(),
  agent           text not null,
  area            text not null,                      -- conversion | pricing | retention | performance | ux | liquidity
  title           text not null,
  detail          text,
  expected_impact text,
  effort          text,
  status          text not null default 'proposed'
                    check (status in ('proposed','approved','done','rejected')),
  created_at      timestamptz not null default now()
);

-- updated_at triggers where applicable
create trigger agent_tasks_set_updated_at before update on public.agent_tasks
  for each row execute function public.set_updated_at();
create trigger growth_leads_set_updated_at before update on public.growth_leads
  for each row execute function public.set_updated_at();

-- RLS: platform admins manage everything; service role bypasses RLS for writes.
do $$
declare t text;
begin
  foreach t in array array[
    'agent_runs','agent_tasks','qa_findings','growth_leads','outreach_drafts',
    'content_drafts','ad_campaign_drafts','analytics_reports','seo_tasks',
    'moderation_queue','churn_risks','optimization_suggestions'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'create policy %1$s_admin_all on public.%1$I for all using (public.is_platform_admin()) with check (public.is_platform_admin());',
      t
    );
  end loop;
end $$;
