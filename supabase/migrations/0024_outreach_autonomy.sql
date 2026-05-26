-- 0024 — Supervised-autonomy outreach: tiers, send-safety, suppression, queue,
-- and reply handling.
--
-- AUTONOMY MODEL (enforced in code + here):
--   Tier 1 (research/score/draft/analyze) runs automatically — safe, no contact.
--   Tier 2 (outbound communication) is DISARMED by default. It only sends when an
--     admin arms the agent AND an email provider is configured AND every message
--     passes the send-safety gate (suppression, cooldown, daily cap, spam-risk,
--     personalization, no prohibited claims, dedupe). Otherwise it holds for
--     approval. Tier 3 (spam/mass/ads/impersonation) is never allowed.
-- Platform-admin only (RLS). Agents write via the service role.

create table public.agent_autonomy (
  agent          text primary key,
  tier           int not null default 1 check (tier in (1, 2)),  -- 3 is forbidden, never stored
  outreach_armed boolean not null default false,                 -- Tier-2 send switch (default OFF)
  daily_send_cap int not null default 10 check (daily_send_cap between 0 and 50),
  cooldown_days  int not null default 14,
  updated_by     uuid references public.profiles (id) on delete set null,
  updated_at     timestamptz not null default now()
);

create table public.outbound_messages (
  id           uuid primary key default gen_random_uuid(),
  prospect_id  uuid references public.founding_prospects (id) on delete set null,
  agent        text not null default 'growth',
  channel      text not null default 'email' check (channel in ('email','contact_form','sms')),
  to_contact   text,
  subject      text,
  body         text not null,
  -- Lifecycle: held (needs approval) → approved → sent | failed; or suppressed/cancelled.
  status       text not null default 'held'
                 check (status in ('held','approved','queued','sent','failed','suppressed','cancelled')),
  spam_risk    int not null default 0,
  risk_reasons text[] not null default '{}',
  hold_reason  text,
  scheduled_for timestamptz,
  sent_at      timestamptz,
  provider_message_id text,
  error        text,
  created_by   uuid references public.profiles (id) on delete set null,  -- null = agent-generated
  approved_by  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index outbound_messages_status_idx on public.outbound_messages (status, created_at desc);
create index outbound_messages_contact_idx on public.outbound_messages (to_contact);

create table public.suppression_list (
  id         uuid primary key default gen_random_uuid(),
  contact    text not null unique,                                -- normalized email/phone
  reason     text not null default 'manual'
               check (reason in ('opt_out','bounce','complaint','manual','hard_block')),
  notes      text,
  created_at timestamptz not null default now()
);

create table public.inbound_replies (
  id           uuid primary key default gen_random_uuid(),
  prospect_id  uuid references public.founding_prospects (id) on delete set null,
  from_contact text,
  subject      text,
  body         text not null,
  classification text,    -- interested | not_interested | follow_up_later | referral | has_solution | pricing | wants_demo | question | spam_bounce
  confidence   numeric,
  handled      boolean not null default false,
  created_at   timestamptz not null default now()
);
create index inbound_replies_idx on public.inbound_replies (handled, created_at desc);

create trigger agent_autonomy_set_updated_at before update on public.agent_autonomy
  for each row execute function public.set_updated_at();
create trigger outbound_messages_set_updated_at before update on public.outbound_messages
  for each row execute function public.set_updated_at();

do $$
declare t text;
begin
  foreach t in array array['agent_autonomy','outbound_messages','suppression_list','inbound_replies'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'create policy %1$s_admin_all on public.%1$I for all using (public.is_platform_admin()) with check (public.is_platform_admin());',
      t
    );
  end loop;
end $$;

-- Seed autonomy rows: Tier-2 agents present but DISARMED; pure-Tier-1 agents at tier 1.
insert into public.agent_autonomy (agent, tier, outreach_armed, daily_send_cap) values
  ('growth', 2, false, 10),
  ('customer_success', 2, false, 10)
on conflict (agent) do nothing;
