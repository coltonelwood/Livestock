-- 0005 — AI receptionist: agents, conversations, messages, interaction telemetry.
-- Public web-chat writes go through a trusted server route (service role).
-- Members read everything in their org and may post agent (human) replies.

create type public.conversation_channel as enum ('web_chat', 'sms', 'voice', 'email');
create type public.message_role as enum ('visitor', 'assistant', 'agent', 'system');

-- ── ai_agents (per-org receptionist configuration) ───────────────────────────
create table public.ai_agents (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organizations (id) on delete cascade,
  name                     text not null default 'Receptionist',
  type                     text not null default 'receptionist',
  greeting                 text,
  system_prompt            text,
  qualification_questions  jsonb not null default '[]'::jsonb,
  is_active                boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index ai_agents_org_idx on public.ai_agents (organization_id);
create trigger ai_agents_set_updated_at before update on public.ai_agents
  for each row execute function public.set_updated_at();

-- ── conversations ─────────────────────────────────────────────────────────────
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  agent_id        uuid references public.ai_agents (id) on delete set null,
  customer_id     uuid references public.customers (id) on delete set null,
  lead_id         uuid references public.leads (id) on delete set null,
  channel         public.conversation_channel not null default 'web_chat',
  status          text not null default 'open',
  visitor_name    text,
  visitor_contact text,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index conversations_org_idx on public.conversations (organization_id);
create trigger conversations_set_updated_at before update on public.conversations
  for each row execute function public.set_updated_at();

-- ── conversation_messages ─────────────────────────────────────────────────────
create table public.conversation_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role            public.message_role not null,
  content         text not null,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index conversation_messages_conv_idx on public.conversation_messages (conversation_id, created_at);

-- ── ai_interactions (cost/latency telemetry) ─────────────────────────────────
create table public.ai_interactions (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations (id) on delete cascade,
  agent_id          uuid references public.ai_agents (id) on delete set null,
  conversation_id   uuid references public.conversations (id) on delete set null,
  model             text,
  prompt_tokens     int,
  completion_tokens int,
  latency_ms        int,
  cost_usd          numeric(10,5),
  created_at        timestamptz not null default now()
);
create index ai_interactions_org_idx on public.ai_interactions (organization_id, created_at);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.ai_agents             enable row level security;
alter table public.conversations         enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.ai_interactions       enable row level security;

-- ai_agents: admins manage; members read.
create policy ai_agents_select on public.ai_agents
  for select using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy ai_agents_insert on public.ai_agents
  for insert with check (public.is_org_admin(organization_id));
create policy ai_agents_update on public.ai_agents
  for update using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
create policy ai_agents_delete on public.ai_agents
  for delete using (public.is_org_admin(organization_id));

-- conversations: members read + manage (human replies / status changes).
create policy conversations_select on public.conversations
  for select using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy conversations_insert on public.conversations
  for insert with check (public.is_org_member(organization_id));
create policy conversations_update on public.conversations
  for update using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- messages: members read + post (agent replies).
create policy conversation_messages_select on public.conversation_messages
  for select using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy conversation_messages_insert on public.conversation_messages
  for insert with check (public.is_org_member(organization_id));

-- ai_interactions: members read; written by the trusted server route.
create policy ai_interactions_select on public.ai_interactions
  for select using (public.is_org_member(organization_id) or public.is_platform_admin());
