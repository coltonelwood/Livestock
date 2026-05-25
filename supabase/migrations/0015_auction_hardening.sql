-- 0015 — Auction hardening: service-role auto-close, cancel sale/lot, platform
-- moderation, and winner detection. end_auction now delegates to close_auction
-- so manual "End sale" and the cron route share one settlement path.

-- close_auction: settle open lots (sold if a bid met reserve, else passed),
-- record winners, and end the sale. No auth check — callable internally by
-- end_auction (admin) and by the cron route via the service role.
create or replace function public.close_auction(p_auction uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_org uuid; v_lot record;
begin
  select organization_id into v_org from public.auctions where id = p_auction;
  if v_org is null then return; end if;

  for v_lot in
    select * from public.auction_lots where auction_id = p_auction and status = 'open'
  loop
    if v_lot.current_bid_usd is not null
       and (v_lot.reserve_price_usd is null or v_lot.current_bid_usd >= v_lot.reserve_price_usd)
    then
      update public.auction_lots set status = 'sold' where id = v_lot.id;
      if v_lot.current_bidder_id is not null then
        insert into public.audit_logs (actor_id, organization_id, action, entity_type, entity_id, metadata)
        values (v_lot.current_bidder_id, v_org, 'auction.won', 'auction_lot', v_lot.id,
                jsonb_build_object('amount', v_lot.current_bid_usd));
      end if;
    else
      update public.auction_lots set status = 'passed' where id = v_lot.id;
    end if;
  end loop;

  update public.auctions set status = 'ended' where id = p_auction and status in ('scheduled', 'live');
  insert into public.audit_logs (actor_id, organization_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), v_org, 'auction.ended', 'auction', p_auction, '{}'::jsonb);
end;
$$;

-- end_auction: owner/admin (or platform admin) ends the sale -> settlement.
create or replace function public.end_auction(p_auction uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.auctions where id = p_auction;
  if v_org is null then raise exception 'AUCTION_NOT_FOUND'; end if;
  if not (public.is_org_admin(v_org) or public.is_platform_admin()) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  perform public.close_auction(p_auction);
end;
$$;

-- cancel_auction: owner/admin or platform admin; cancels the sale and open lots.
create or replace function public.cancel_auction(p_auction uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.auctions where id = p_auction;
  if v_org is null then raise exception 'AUCTION_NOT_FOUND'; end if;
  if not (public.is_org_admin(v_org) or public.is_platform_admin()) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  update public.auction_lots set status = 'cancelled'
    where auction_id = p_auction and status = 'open';
  update public.auctions set status = 'cancelled' where id = p_auction;
  insert into public.audit_logs (actor_id, organization_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), v_org, 'auction.cancelled', 'auction', p_auction, '{}'::jsonb);
end;
$$;

-- cancel_lot: owner/admin or platform admin; pulls a single lot.
create or replace function public.cancel_lot(p_lot uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.auction_lots where id = p_lot;
  if v_org is null then raise exception 'LOT_NOT_FOUND'; end if;
  if not (public.is_org_admin(v_org) or public.is_platform_admin()) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  update public.auction_lots set status = 'cancelled' where id = p_lot;
  insert into public.audit_logs (actor_id, organization_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), v_org, 'lot.cancelled', 'auction_lot', p_lot, '{}'::jsonb);
end;
$$;

-- close_auction is internal/service-role only.
revoke execute on function public.close_auction(uuid) from public;
