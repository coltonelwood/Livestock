-- RLS tenant-isolation test suite.
--
-- Runs against any Postgres that has the Supabase-style `auth` schema, an
-- `auth.uid()` reading `request.jwt.claim.sub`, and `anon`/`authenticated`
-- roles. See supabase/tests/README.md for the local harness. Each assertion
-- RAISEs on violation, so the script exits non-zero if isolation ever breaks.

\set u1 '11111111-1111-1111-1111-111111111111'
\set u2 '22222222-2222-2222-2222-222222222222'

reset role;
insert into auth.users (id, email, raw_user_meta_data) values
  (:'u1','alice@example.com','{"full_name":"Alice"}'),
  (:'u2','bob@example.com','{"full_name":"Bob"}');

-- u1 creates Ranch A; u2 creates Ranch B. Stash org ids in GUCs so DO blocks
-- (which don't get psql variable interpolation) can read them.
select set_config('request.jwt.claim.sub', :'u1', false);
set role authenticated;
select public.create_organization('Ranch A','ranch-a','ranch') as org_a \gset
reset role;
select set_config('test.org_a', :'org_a', false);

select set_config('request.jwt.claim.sub', :'u2', false);
set role authenticated;
select public.create_organization('Ranch B','ranch-b','breeder') as org_b \gset
reset role;
select set_config('test.org_b', :'org_b', false);

-- TEST 1: u1 sees only their own org.
select set_config('request.jwt.claim.sub', :'u1', false);
set role authenticated;
do $$ declare c int; begin
  select count(*) into c from public.organizations;
  if c <> 1 then raise exception 'FAIL t1: u1 should see 1 org, saw %', c; end if;
end $$;

-- TEST 2: u1 cannot read org B.
do $$ declare c int; begin
  select count(*) into c from public.organizations
    where id = current_setting('test.org_b')::uuid;
  if c <> 0 then raise exception 'FAIL t2: u1 read foreign org B'; end if;
end $$;

-- TEST 3: u1 may insert a customer into A but NOT into B.
do $$ begin
  insert into public.customers (organization_id, name)
    values (current_setting('test.org_a')::uuid, 'Buyer One');
end $$;
do $$ begin
  insert into public.customers (organization_id, name)
    values (current_setting('test.org_b')::uuid, 'Intruder');
  raise exception 'FAIL t3: u1 inserted customer into foreign org B';
exception when insufficient_privilege then null;
end $$;

-- TEST 4: u1 creates an active and a draft listing in A.
do $$ begin
  insert into public.livestock_listings (organization_id, title, status)
    values (current_setting('test.org_a')::uuid, 'Angus bull', 'active');
  insert into public.livestock_listings (organization_id, title, status)
    values (current_setting('test.org_a')::uuid, 'Draft heifer', 'draft');
end $$;
reset role;

-- TEST 5: u2 cannot see u1's customers.
select set_config('request.jwt.claim.sub', :'u2', false);
set role authenticated;
do $$ declare c int; begin
  select count(*) into c from public.customers;
  if c <> 0 then raise exception 'FAIL t5: u2 saw u1 customers (%)', c; end if;
end $$;
reset role;

-- TEST 6: anon reads ACTIVE listings only, and no customers.
select set_config('request.jwt.claim.sub', '', false);
set role anon;
do $$ declare active_c int; draft_c int; cust_c int; begin
  select count(*) into active_c from public.livestock_listings where status='active';
  select count(*) into draft_c  from public.livestock_listings where status='draft';
  select count(*) into cust_c   from public.customers;
  if active_c <> 1 then raise exception 'FAIL t6a: anon active listings = %', active_c; end if;
  if draft_c  <> 0 then raise exception 'FAIL t6b: anon read DRAFT listings (%)', draft_c; end if;
  if cust_c   <> 0 then raise exception 'FAIL t6c: anon read customers (%)', cust_c; end if;
end $$;

-- TEST 7: anon cannot insert a customer.
do $$ begin
  insert into public.customers (organization_id, name)
    values (current_setting('test.org_b')::uuid, 'x');
  raise exception 'FAIL t7: anon inserted a customer';
exception when insufficient_privilege then null;
end $$;
reset role;

-- TEST 8: privilege-escalation guard blocks self-promotion to platform_admin.
select set_config('request.jwt.claim.sub', :'u1', false);
set role authenticated;
do $$ begin
  update public.profiles set platform_role='platform_admin'
    where id = '11111111-1111-1111-1111-111111111111'::uuid;
  raise exception 'FAIL t8: u1 escalated to platform_admin';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;  -- re-raise our own assertion only
end $$;
reset role;

-- TEST 9: storefront — ranch_profile is private by default, public only when
-- the owner opts in (is_public).
select set_config('request.jwt.claim.sub', '', false);
set role anon;
do $$ declare c int; begin
  select count(*) into c from public.ranch_profiles
    where organization_id = current_setting('test.org_a')::uuid;
  if c <> 0 then raise exception 'FAIL t9: anon saw a private ranch profile'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', :'u1', false);
set role authenticated;
do $$ begin
  update public.ranch_profiles set is_public = true
    where organization_id = current_setting('test.org_a')::uuid;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);
set role anon;
do $$ declare c int; begin
  select count(*) into c from public.ranch_profiles
    where organization_id = current_setting('test.org_a')::uuid;
  if c <> 1 then raise exception 'FAIL t9: anon cannot see a public storefront (%)', c; end if;
end $$;
reset role;

select '=== ALL RLS TESTS PASSED ===' as result;