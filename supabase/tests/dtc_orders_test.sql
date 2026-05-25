-- DTC commerce test suite: place_order / mark_order_paid / cancel / fulfill.
-- Proves: oversell impossible, price comes from the DB, paid is idempotent
-- (no double-process), mark_order_paid is service-role only, buyer/seller order
-- isolation, fulfill auth, and cancel restores inventory.

\set u1 '11111111-1111-1111-1111-111111111111'
\set u2 '22222222-2222-2222-2222-222222222222'
\set u3 '33333333-3333-3333-3333-333333333333'
\set p1 'cccccccc-cccc-cccc-cccc-ccccccccccc1'
\set p2 'cccccccc-cccc-cccc-cccc-ccccccccccc2'
\set p3 'cccccccc-cccc-cccc-cccc-ccccccccccc3'
\set p4 'cccccccc-cccc-cccc-cccc-ccccccccccc4'

reset role;
insert into auth.users (id, email) values
  (:'u1','seller@example.com'), (:'u2','buyer@example.com'), (:'u3','other@example.com');

select set_config('request.jwt.claim.sub', :'u1', false);
set role authenticated;
select public.create_organization('Beef Ranch','beef-ranch','ranch') as org_a \gset
reset role;
select set_config('test.org_a', :'org_a', false);

-- Seller stocks products (p1 tracked=5, p2 untracked, p3 tracked=4, p4 draft).
select set_config('request.jwt.claim.sub', :'u1', false);
set role authenticated;
do $$ declare org uuid := current_setting('test.org_a')::uuid; begin
  insert into public.meat_products (id, organization_id, name, price_usd, inventory, status) values
    ('cccccccc-cccc-cccc-cccc-ccccccccccc1', org, 'Quarter beef', 100, 5, 'active'),
    ('cccccccc-cccc-cccc-cccc-ccccccccccc2', org, 'Ribeye bundle', 50, null, 'active'),
    ('cccccccc-cccc-cccc-cccc-ccccccccccc3', org, 'Half beef', 200, 4, 'active'),
    ('cccccccc-cccc-cccc-cccc-ccccccccccc4', org, 'Draft box', 75, 10, 'draft');
end $$;
reset role;

-- TEST 1: anonymous cannot place an order.
select set_config('request.jwt.claim.sub', '', false);
set role anon;
do $$ begin
  perform public.place_order('[{"product_id":"cccccccc-cccc-cccc-cccc-ccccccccccc1","quantity":1}]'::jsonb);
  raise exception 'FAIL t1: anon ordered';
exception when others then
  if sqlerrm not in ('AUTH_REQUIRED','permission denied for function place_order') then
    raise exception 'FAIL t1: %', sqlerrm; end if;
end $$;
reset role;

-- TEST 2: buyer orders 3 of p1 -> pending_payment, total 300, inventory 5->2.
select set_config('request.jwt.claim.sub', :'u2', false);
set role authenticated;
select (public.place_order('[{"product_id":"cccccccc-cccc-cccc-cccc-ccccccccccc1","quantity":3}]'::jsonb)->>'order_id') as o2 \gset
reset role;
select set_config('test.o2', :'o2', false);
do $$ declare inv int; tot numeric; st text; begin
  select inventory into inv from public.meat_products where id = 'cccccccc-cccc-cccc-cccc-ccccccccccc1';
  if inv <> 2 then raise exception 'FAIL t2: inventory % (expected 2)', inv; end if;
  select total_usd, status::text into tot, st from public.orders where id = current_setting('test.o2')::uuid;
  if tot <> 300 then raise exception 'FAIL t2: total % (expected 300, from DB price)', tot; end if;
  if st <> 'pending_payment' then raise exception 'FAIL t2: status %', st; end if;
end $$;

-- TEST 3: cannot oversell (only 2 left, request 3).
select set_config('request.jwt.claim.sub', :'u2', false);
set role authenticated;
do $$ begin
  perform public.place_order('[{"product_id":"cccccccc-cccc-cccc-cccc-ccccccccccc1","quantity":3}]'::jsonb);
  raise exception 'FAIL t3: oversold';
exception when others then
  if left(sqlerrm, 21) <> 'INSUFFICIENT_INVENTOR' then raise exception 'FAIL t3: %', sqlerrm; end if;
end $$;

-- TEST 4: buy the remaining 2 -> inventory 0; TEST 5: sold out rejects.
do $$ begin perform public.place_order('[{"product_id":"cccccccc-cccc-cccc-cccc-ccccccccccc1","quantity":2}]'::jsonb); end $$;
do $$ declare inv int; begin
  select inventory into inv from public.meat_products where id = 'cccccccc-cccc-cccc-cccc-ccccccccccc1';
  if inv <> 0 then raise exception 'FAIL t4: inventory % (expected 0)', inv; end if;
end $$;
do $$ begin
  perform public.place_order('[{"product_id":"cccccccc-cccc-cccc-cccc-ccccccccccc1","quantity":1}]'::jsonb);
  raise exception 'FAIL t5: sold-out purchase allowed';
exception when others then
  if left(sqlerrm, 21) <> 'INSUFFICIENT_INVENTOR' then raise exception 'FAIL t5: %', sqlerrm; end if;
end $$;

-- TEST 6: a draft (unpublished) product cannot be bought.
do $$ begin
  perform public.place_order('[{"product_id":"cccccccc-cccc-cccc-cccc-ccccccccccc4","quantity":1}]'::jsonb);
  raise exception 'FAIL t6: bought unpublished product';
exception when others then
  if sqlerrm <> 'PRODUCT_UNAVAILABLE' then raise exception 'FAIL t6: %', sqlerrm; end if;
end $$;

-- TEST 7: untracked inventory product has no cap.
do $$ declare tot numeric; oid uuid; begin
  oid := (public.place_order('[{"product_id":"cccccccc-cccc-cccc-cccc-ccccccccccc2","quantity":10}]'::jsonb)->>'order_id')::uuid;
  select total_usd into tot from public.orders where id = oid;
  if tot <> 500 then raise exception 'FAIL t7: total % (expected 500)', tot; end if;
end $$;
reset role;

-- TEST 8: mark_order_paid is NOT callable by a normal authenticated user.
select set_config('request.jwt.claim.sub', :'u2', false);
set role authenticated;
do $$ begin
  perform public.mark_order_paid(current_setting('test.o2')::uuid, null);
  raise exception 'FAIL t8: buyer marked own order paid';
exception when insufficient_privilege then null;
end $$;
reset role;

-- TEST 9: service role marks paid; duplicate webhook does not double-process.
do $$ declare st text; n int; begin
  perform public.mark_order_paid(current_setting('test.o2')::uuid, 'cs_test_1');
  perform public.mark_order_paid(current_setting('test.o2')::uuid, 'cs_test_1'); -- duplicate
  select status::text into st from public.orders where id = current_setting('test.o2')::uuid;
  if st <> 'paid' then raise exception 'FAIL t9: status %', st; end if;
  select count(*) into n from public.audit_logs
    where entity_id = current_setting('test.o2')::uuid and action = 'order.paid';
  if n <> 1 then raise exception 'FAIL t9: % paid-audit rows (expected 1)', n; end if;
end $$;

-- TEST 10: order isolation — buyer sees own; a stranger does not.
select set_config('request.jwt.claim.sub', :'u3', false);
set role authenticated;
do $$ declare c int; begin
  select count(*) into c from public.orders where id = current_setting('test.o2')::uuid;
  if c <> 0 then raise exception 'FAIL t10: stranger saw buyer order'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', :'u2', false);
set role authenticated;
do $$ declare c int; begin
  select count(*) into c from public.orders where id = current_setting('test.o2')::uuid;
  if c <> 1 then raise exception 'FAIL t10: buyer cannot see own order'; end if;
  select count(*) into c from public.order_items where order_id = current_setting('test.o2')::uuid;
  if c < 1 then raise exception 'FAIL t10: buyer cannot see own order items'; end if;
end $$;

-- TEST 11: buyer cannot fulfill; seller-admin can.
do $$ begin
  perform public.fulfill_order(current_setting('test.o2')::uuid);
  raise exception 'FAIL t11: buyer fulfilled order';
exception when others then
  if sqlerrm <> 'NOT_AUTHORIZED' then raise exception 'FAIL t11: %', sqlerrm; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', :'u1', false);
set role authenticated;
do $$ declare st text; begin
  perform public.fulfill_order(current_setting('test.o2')::uuid);
  select status::text into st from public.orders where id = current_setting('test.o2')::uuid;
  if st <> 'fulfilled' then raise exception 'FAIL t11: status %', st; end if;
end $$;
reset role;

-- TEST 12: cancel restores inventory and is idempotent.
select set_config('request.jwt.claim.sub', :'u2', false);
set role authenticated;
select (public.place_order('[{"product_id":"cccccccc-cccc-cccc-cccc-ccccccccccc3","quantity":2}]'::jsonb)->>'order_id') as o3 \gset
reset role;
select set_config('test.o3', :'o3', false);
select set_config('request.jwt.claim.sub', :'u2', false);
set role authenticated;
do $$ declare inv int; st text; begin
  select inventory into inv from public.meat_products where id = 'cccccccc-cccc-cccc-cccc-ccccccccccc3';
  if inv <> 2 then raise exception 'FAIL t12: reserved inventory % (expected 2)', inv; end if;
  perform public.cancel_order(current_setting('test.o3')::uuid);
  perform public.cancel_order(current_setting('test.o3')::uuid); -- idempotent
  select inventory into inv from public.meat_products where id = 'cccccccc-cccc-cccc-cccc-ccccccccccc3';
  if inv <> 4 then raise exception 'FAIL t12: inventory not restored % (expected 4)', inv; end if;
  select status::text into st from public.orders where id = current_setting('test.o3')::uuid;
  if st <> 'cancelled' then raise exception 'FAIL t12: status %', st; end if;
end $$;
reset role;

select '=== ALL DTC ORDER TESTS PASSED ===' as result;
