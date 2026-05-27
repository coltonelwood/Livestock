-- Agent infrastructure verification. Runs in the local DB suite (proves the
-- 0021–0024 migrations create everything correctly) AND can be run by the
-- operator against the LIVE project after migrating, to confirm activation:
--   psql "$DATABASE_URL" -f supabase/tests/agents_infra_test.sql
-- Fails loudly (RAISE EXCEPTION) if anything is missing; prints PASSED otherwise.

do $$
declare
  t text;
  tables text[] := array[
    -- 0021
    'agent_runs','agent_tasks','qa_findings','growth_leads','outreach_drafts',
    'content_drafts','ad_campaign_drafts','analytics_reports','seo_tasks',
    'moderation_queue','churn_risks','optimization_suggestions',
    -- 0022
    'agent_memories','agent_lessons','agent_decisions','agent_feedback',
    'agent_experiments','agent_experiment_results','agent_playbooks',
    'agent_preferences','agent_knowledge_sources','agent_performance_metrics',
    -- 0023
    'founding_prospects','prospect_referrers','prospect_events',
    -- 0024
    'agent_autonomy','outbound_messages','suppression_list','inbound_replies'
  ];
  n_missing int := 0;
  n_no_rls int := 0;
  n_no_policy int := 0;
begin
  foreach t in array tables loop
    -- table exists
    if to_regclass('public.' || t) is null then
      raise warning 'MISSING TABLE: %', t; n_missing := n_missing + 1; continue;
    end if;
    -- RLS enabled
    if not (select relrowsecurity from pg_class where oid = ('public.' || t)::regclass) then
      raise warning 'RLS DISABLED: %', t; n_no_rls := n_no_rls + 1;
    end if;
    -- at least one policy
    if (select count(*) from pg_policies where schemaname = 'public' and tablename = t) = 0 then
      raise warning 'NO POLICY: %', t; n_no_policy := n_no_policy + 1;
    end if;
  end loop;

  if n_missing > 0 then raise exception 'AGENT INFRA FAIL: % missing table(s)', n_missing; end if;
  if n_no_rls > 0 then raise exception 'AGENT INFRA FAIL: % table(s) without RLS', n_no_rls; end if;
  if n_no_policy > 0 then raise exception 'AGENT INFRA FAIL: % table(s) without a policy', n_no_policy; end if;

  -- Key indexes present (sample across the set).
  if to_regclass('public.agent_memories_lookup_idx') is null then raise exception 'AGENT INFRA FAIL: agent_memories_lookup_idx missing'; end if;
  if to_regclass('public.founding_prospects_dedupe_idx') is null then raise exception 'AGENT INFRA FAIL: founding_prospects_dedupe_idx missing'; end if;
  if to_regclass('public.outbound_messages_status_idx') is null then raise exception 'AGENT INFRA FAIL: outbound_messages_status_idx missing'; end if;

  -- Seeds from migrations are present (so memory/playbooks/autonomy work day one).
  if (select count(*) from public.agent_playbooks) < 3 then raise exception 'AGENT INFRA FAIL: starter playbooks not seeded'; end if;
  if (select count(*) from public.agent_memories where memory_type = 'brand_rule') < 3 then raise exception 'AGENT INFRA FAIL: brand-rule memories not seeded'; end if;
  if (select count(*) from public.agent_autonomy) < 2 then raise exception 'AGENT INFRA FAIL: Tier-2 autonomy rows not seeded'; end if;

  -- Safety invariant: no Tier-2 agent ships ARMED.
  if exists (select 1 from public.agent_autonomy where outreach_armed) then
    raise exception 'AGENT INFRA FAIL: an agent is armed by default (must ship disarmed)';
  end if;
end $$;

select 'AGENT INFRA: ALL CHECKS PASSED (29 tables, RLS, indexes, seeds, disarmed)' as result;
