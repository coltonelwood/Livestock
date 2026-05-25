-- 0013 — Real auctions: sale events, lots, concurrency-safe bidding, status
-- transitions, public visibility, and moderation. Replaces the placeholder.
--
-- Money-and-concurrency mutations (bids, settlement) run ONLY inside SECURITY
-- DEFINER functions that lock the lot row (SELECT ... FOR UPDATE), so two
-- simultaneous bids can never both win. App code calls these RPCs; it never
-- writes bids or lot state directly.

-- ── Enums & columns ───────────────────────────────────────────────────────────
create type public.lot_status as enum ('open', 'sold', 'passed', 'cancelled');

alter table public.auctions
  add column if not exists description text,
  add column if not exists location text;

-- ── auction_lots ──────────────────────────────────────────────────────────────
create table public.auction_lots (
  id                uuid primary key default gen_random_uuid(),
  auction_id        uuid not null references public.auctions (id) on delete cascade,
  organization_id   uuid not null references public.organizations (id) on delete cascade,
  lot_number        int not null,
  title             text not null,
  description       text,
  species           public.species not null default 'cattle',
  head_count        int not null default 1,
  opening_bid_usd   numeric(12,2) not null default 0,
  reserve_price_usd numeric(12,2),
  bid_increment_usd numeric(12,2) not null default 25,
  status            public.lot_status not null default 'open',
  current_bid_usd   numeric(12,2),
  current_bidder_id uuid references public.profiles (id) on delete set null,
  bid_count         int not null default 0,
  closes_at         timestamptz,
  photos            jsonb not null default '[]'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (auction_id, lot_number),
  constraint bid_increment_positive check (bid_increment_usd > 0),
  constraint head_count_positive check (head_count > 0)
);
create index auction_lots_auction_idx on public.auction_lots (auction_id, lot_number);
create index auction_lots_org_idx on public.auction_lots (organization_id);
create trigger auction_lots_set_updated_at before update on public.auction_lots
  for each row execute function public.set_updated_at();

-- ── bids: repoint at lots ──────────────────────────────────────────────────────
alter table public.bids
  add column if not exists lot_id uuid references public.auction_lots (id) on delete cascade;
create index if not exists bids_lot_idx on public.bids (lot_id, created_at desc);

-- Bids are written ONLY by place_bid(); remove the direct member-insert policy.
drop policy if exists bids_insert on public.bids;

-- ── Public visibility helpers (SECURITY DEFINER: read without recursing RLS) ──
create or replace function public.auction_is_public(p_auction uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.auctions a
    where a.id = p_auction and a.status in ('scheduled', 'live', 'ended')
  );
$$;

create or replace function public.lot_is_public(p_lot uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.auction_lots l
    join public.auctions a on a.id = l.auction_id
    where l.id = p_lot and a.status in ('scheduled', 'live', 'ended')
  );
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────────--
alter table public.auction_lots enable row level security;

-- auctions: anyone may view non-cancelled sales; members see their own; admins manage.
create policy auctions_select_public on public.auctions
  for select using (status in ('scheduled', 'live', 'ended'));

-- auction_lots: public read for public auctions; members read their own; admins manage.
create policy auction_lots_select_public on public.auction_lots
  for select using (public.auction_is_public(auction_id));
create policy auction_lots_select_member on public.auction_lots
  for select using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy auction_lots_insert on public.auction_lots
  for insert with check (public.is_org_admin(organization_id));
create policy auction_lots_update on public.auction_lots
  for update using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
create policy auction_lots_delete on public.auction_lots
  for delete using (public.is_org_admin(organization_id));

-- bids: public may read bid history on public lots; members read their org's.
create policy bids_select_public on public.bids
  for select using (lot_id is not null and public.lot_is_public(lot_id));

-- ── place_bid: the authoritative, concurrency-safe bid path ───────────────────
create or replace function public.place_bid(p_lot_id uuid, p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user    uuid := auth.uid();
  v_lot     public.auction_lots%rowtype;
  v_auction public.auctions%rowtype;
  v_min     numeric;
  v_prev    uuid;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- Lock the lot row: serializes concurrent bids on the same lot.
  select * into v_lot from public.auction_lots where id = p_lot_id for update;
  if not found then
    raise exception 'LOT_NOT_FOUND';
  end if;

  select * into v_auction from public.auctions where id = v_lot.auction_id;
  if v_auction.status <> 'live' then
    raise exception 'AUCTION_NOT_LIVE';
  end if;
  if v_lot.status <> 'open' then
    raise exception 'LOT_NOT_OPEN';
  end if;
  if v_lot.closes_at is not null and now() >= v_lot.closes_at then
    raise exception 'LOT_CLOSED';
  end if;

  -- Anti-self-bid: a member of the selling org cannot bid on its own lot.
  if exists (
    select 1 from public.organization_members m
    where m.organization_id = v_lot.organization_id and m.user_id = v_user
  ) then
    raise exception 'SELF_BID_FORBIDDEN';
  end if;

  v_min := coalesce(v_lot.current_bid_usd + v_lot.bid_increment_usd, v_lot.opening_bid_usd);
  if p_amount < v_min then
    raise exception 'BID_TOO_LOW:%', v_min;
  end if;

  v_prev := v_lot.current_bidder_id;

  insert into public.bids (lot_id, auction_id, organization_id, bidder_id, amount_usd)
  values (p_lot_id, v_lot.auction_id, v_lot.organization_id, v_user, p_amount);

  update public.auction_lots
    set current_bid_usd = p_amount,
        current_bidder_id = v_user,
        bid_count = bid_count + 1
    where id = p_lot_id;

  insert into public.audit_logs (actor_id, organization_id, action, entity_type, entity_id, metadata)
  values (v_user, v_lot.organization_id, 'auction.bid_placed', 'auction_lot', p_lot_id,
          jsonb_build_object('amount', p_amount));

  -- Outbid detection (delivery handled by the notifications system).
  if v_prev is not null and v_prev <> v_user then
    insert into public.audit_logs (actor_id, organization_id, action, entity_type, entity_id, metadata)
    values (v_prev, v_lot.organization_id, 'auction.outbid', 'auction_lot', p_lot_id,
            jsonb_build_object('new_amount', p_amount));
  end if;

  return jsonb_build_object(
    'ok', true,
    'lot_id', p_lot_id,
    'current_bid', p_amount,
    'bid_count', v_lot.bid_count + 1,
    'min_next_bid', p_amount + v_lot.bid_increment_usd
  );
end;
$$;

-- ── Status transitions (owner/admin only) ─────────────────────────────────────
create or replace function public.start_auction(p_auction uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.auctions where id = p_auction;
  if v_org is null then raise exception 'AUCTION_NOT_FOUND'; end if;
  if not public.is_org_admin(v_org) then raise exception 'NOT_AUTHORIZED'; end if;

  update public.auctions set status = 'live'
    where id = p_auction and status = 'scheduled';

  -- Lots inherit the auction's end time if they have no explicit close.
  update public.auction_lots l
    set closes_at = coalesce(l.closes_at, a.ends_at)
    from public.auctions a
    where l.auction_id = p_auction and a.id = p_auction;

  insert into public.audit_logs (actor_id, organization_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), v_org, 'auction.started', 'auction', p_auction, '{}'::jsonb);
end;
$$;

create or replace function public.end_auction(p_auction uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.auctions where id = p_auction;
  if v_org is null then raise exception 'AUCTION_NOT_FOUND'; end if;
  if not public.is_org_admin(v_org) then raise exception 'NOT_AUTHORIZED'; end if;

  -- Settle open lots: sold if a bid met reserve, otherwise passed.
  update public.auction_lots
    set status = case
      when current_bid_usd is not null
        and (reserve_price_usd is null or current_bid_usd >= reserve_price_usd)
      then 'sold'::public.lot_status
      else 'passed'::public.lot_status
    end
    where auction_id = p_auction and status = 'open';

  update public.auctions set status = 'ended'
    where id = p_auction and status in ('scheduled', 'live');

  insert into public.audit_logs (actor_id, organization_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), v_org, 'auction.ended', 'auction', p_auction, '{}'::jsonb);
end;
$$;
