-- 0020 — place_bid now returns the previous high bidder so the app can send an
-- outbid notification. Behavior is otherwise identical to 0013.

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
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_lot from public.auction_lots where id = p_lot_id for update;
  if not found then raise exception 'LOT_NOT_FOUND'; end if;

  select * into v_auction from public.auctions where id = v_lot.auction_id;
  if v_auction.status <> 'live' then raise exception 'AUCTION_NOT_LIVE'; end if;
  if v_lot.status <> 'open' then raise exception 'LOT_NOT_OPEN'; end if;
  if v_lot.closes_at is not null and now() >= v_lot.closes_at then raise exception 'LOT_CLOSED'; end if;

  if exists (
    select 1 from public.organization_members m
    where m.organization_id = v_lot.organization_id and m.user_id = v_user
  ) then
    raise exception 'SELF_BID_FORBIDDEN';
  end if;

  v_min := coalesce(v_lot.current_bid_usd + v_lot.bid_increment_usd, v_lot.opening_bid_usd);
  if p_amount < v_min then raise exception 'BID_TOO_LOW:%', v_min; end if;

  v_prev := v_lot.current_bidder_id;

  insert into public.bids (lot_id, auction_id, organization_id, bidder_id, amount_usd)
  values (p_lot_id, v_lot.auction_id, v_lot.organization_id, v_user, p_amount);

  update public.auction_lots
    set current_bid_usd = p_amount, current_bidder_id = v_user, bid_count = bid_count + 1
    where id = p_lot_id;

  insert into public.audit_logs (actor_id, organization_id, action, entity_type, entity_id, metadata)
  values (v_user, v_lot.organization_id, 'auction.bid_placed', 'auction_lot', p_lot_id,
          jsonb_build_object('amount', p_amount));

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
    'min_next_bid', p_amount + v_lot.bid_increment_usd,
    'previous_bidder', v_prev,
    'lot_title', v_lot.title
  );
end;
$$;
