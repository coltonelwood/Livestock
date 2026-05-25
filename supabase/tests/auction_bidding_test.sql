-- Auction bidding test suite. Exercises place_bid / start_auction / end_auction
-- under the Supabase-style roles. Each assertion RAISEs on violation.
--
-- Concurrency note: place_bid() locks the lot row with SELECT ... FOR UPDATE,
-- so simultaneous bids serialize. We can't spawn true parallel sessions in a
-- single psql script, but we prove the decisive guard: once the high bid is N,
-- a second bid that isn't strictly higher (N, or N without the increment) is
-- rejected — exactly the outcome the losing side of a race receives.

\set u1 '11111111-1111-1111-1111-111111111111'
\set u2 '22222222-2222-2222-2222-222222222222'
\set u3 '33333333-3333-3333-3333-333333333333'
\set auction 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
\set lot 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

reset role;
insert into auth.users (id, email) values
  (:'u1','seller@example.com'), (:'u2','buyer2@example.com'), (:'u3','buyer3@example.com');

-- Seller u1 creates org A.
select set_config('request.jwt.claim.sub', :'u1', false);
set role authenticated;
select public.create_organization('Sale Barn A','sale-barn-a','auction_house') as org_a \gset
reset role;
select set_config('test.org_a', :'org_a', false);

-- u1 creates an auction + lot (opening 1000, increment 100, reserve 1500).
select set_config('request.jwt.claim.sub', :'u1', false);
set role authenticated;
do $$ begin
  insert into public.auctions (id, organization_id, title, status, starts_at, ends_at)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_setting('test.org_a')::uuid,
          'Friday Cattle Sale', 'scheduled', now(), now() + interval '1 day');
  insert into public.auction_lots
    (id, auction_id, organization_id, lot_number, title, opening_bid_usd, reserve_price_usd, bid_increment_usd)
  values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          current_setting('test.org_a')::uuid, 1, 'Angus heifers', 1000, 1500, 100);
end $$;

-- TEST 1: bidding before the auction is live is rejected.
reset role;
select set_config('request.jwt.claim.sub', :'u2', false);
set role authenticated;
do $$ begin
  perform public.place_bid('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1000);
  raise exception 'FAIL t1: bid accepted before auction live';
exception when others then
  if sqlerrm <> 'AUCTION_NOT_LIVE' then raise exception 'FAIL t1: wrong error %', sqlerrm; end if;
end $$;
reset role;

-- Start the auction (owner only).
select set_config('request.jwt.claim.sub', :'u1', false);
set role authenticated;
do $$ begin perform public.start_auction('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'); end $$;
reset role;

-- TEST 2: a non-owner cannot start/end the auction.
select set_config('request.jwt.claim.sub', :'u2', false);
set role authenticated;
do $$ begin
  perform public.end_auction('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  raise exception 'FAIL t2: non-owner ended auction';
exception when others then
  if sqlerrm <> 'NOT_AUTHORIZED' then raise exception 'FAIL t2: wrong error %', sqlerrm; end if;
end $$;

-- TEST 3: first valid bid at the opening price is accepted.
do $$ declare r jsonb; begin
  r := public.place_bid('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1000);
  if (r->>'current_bid')::numeric <> 1000 then raise exception 'FAIL t3: current_bid %', r; end if;
end $$;
reset role;

-- TEST 4: a bid below current + increment is rejected (the race-loser outcome).
select set_config('request.jwt.claim.sub', :'u3', false);
set role authenticated;
do $$ begin
  perform public.place_bid('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1050);
  raise exception 'FAIL t4: too-low bid accepted';
exception when others then
  if left(sqlerrm, 11) <> 'BID_TOO_LOW' then raise exception 'FAIL t4: wrong error %', sqlerrm; end if;
end $$;

-- TEST 5: equalling the current high bid (no increment) is also rejected.
do $$ begin
  perform public.place_bid('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1000);
  raise exception 'FAIL t5: equal bid accepted';
exception when others then
  if left(sqlerrm, 11) <> 'BID_TOO_LOW' then raise exception 'FAIL t5: wrong error %', sqlerrm; end if;
end $$;

-- TEST 6: a valid raise to the minimum is accepted.
do $$ declare r jsonb; begin
  r := public.place_bid('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1100);
  if (r->>'current_bid')::numeric <> 1100 then raise exception 'FAIL t6'; end if;
end $$;
reset role;

-- TEST 7: the seller cannot bid on its own lot.
select set_config('request.jwt.claim.sub', :'u1', false);
set role authenticated;
do $$ begin
  perform public.place_bid('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 2000);
  raise exception 'FAIL t7: self-bid accepted';
exception when others then
  if sqlerrm <> 'SELF_BID_FORBIDDEN' then raise exception 'FAIL t7: wrong error %', sqlerrm; end if;
end $$;
reset role;

-- TEST 8: anonymous cannot bid.
select set_config('request.jwt.claim.sub', '', false);
set role anon;
do $$ begin
  perform public.place_bid('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 5000);
  raise exception 'FAIL t8: anon bid accepted';
exception when others then
  if sqlerrm <> 'AUTH_REQUIRED' then raise exception 'FAIL t8: wrong error %', sqlerrm; end if;
end $$;

-- TEST 9: anon CAN read the public auction, lot, and bid history.
do $$ declare c int; begin
  select count(*) into c from public.auctions where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if c <> 1 then raise exception 'FAIL t9a: anon cannot see live auction'; end if;
  select count(*) into c from public.auction_lots where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  if c <> 1 then raise exception 'FAIL t9b: anon cannot see lot'; end if;
  select count(*) into c from public.bids where lot_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  if c < 2 then raise exception 'FAIL t9c: anon cannot read bid history (%)', c; end if;
end $$;
reset role;

-- TEST 10: ending the auction settles the lot as PASSED (1100 < reserve 1500).
select set_config('request.jwt.claim.sub', :'u1', false);
set role authenticated;
do $$ begin perform public.end_auction('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'); end $$;
do $$ declare s text; a text; begin
  select status::text into s from public.auction_lots where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  if s <> 'passed' then raise exception 'FAIL t10: lot status % (expected passed)', s; end if;
  select status::text into a from public.auctions where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if a <> 'ended' then raise exception 'FAIL t10: auction status % (expected ended)', a; end if;
end $$;

-- TEST 11: no bidding after the auction has ended.
reset role;
select set_config('request.jwt.claim.sub', :'u2', false);
set role authenticated;
do $$ begin
  perform public.place_bid('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 5000);
  raise exception 'FAIL t11: bid accepted after end';
exception when others then
  if sqlerrm <> 'AUCTION_NOT_LIVE' then raise exception 'FAIL t11: wrong error %', sqlerrm; end if;
end $$;
reset role;

-- TEST 12: a different org's admin cannot add a lot to org A's auction.
select set_config('request.jwt.claim.sub', :'u2', false);
set role authenticated;
select public.create_organization('Other Barn','other-barn','auction_house') as org_b \gset
do $$ begin
  insert into public.auction_lots (auction_id, organization_id, lot_number, title, opening_bid_usd)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_setting('test.org_a')::uuid, 2, 'Intruder lot', 100);
  raise exception 'FAIL t12: cross-org lot insert allowed';
exception when insufficient_privilege then null;
end $$;
reset role;

select '=== ALL AUCTION TESTS PASSED ===' as result;
