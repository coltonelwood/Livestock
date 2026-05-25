-- 0014 — DTC commerce: orders, order_items, inventory, and the authoritative
-- order lifecycle RPCs.
--
-- Oversell safety: inventory is RESERVED atomically when the order is created
-- (place_order locks each product row FOR UPDATE and decrements), never in the
-- Stripe webhook. So a duplicate webhook can NEVER double-deduct inventory —
-- marking paid is a pure status flip. Cancel/refund restore inventory.

alter type public.order_status add value if not exists 'pending_payment';
alter type public.order_status add value if not exists 'refunded';

alter table public.orders
  add column if not exists buyer_id uuid references public.profiles (id) on delete set null,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists currency text not null default 'usd',
  add column if not exists paid_at timestamptz,
  add column if not exists fulfilled_at timestamptz,
  add column if not exists canceled_at timestamptz,
  add column if not exists refunded_at timestamptz;
create index if not exists orders_buyer_idx on public.orders (buyer_id);

create table public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  buyer_id        uuid references public.profiles (id) on delete set null,
  product_id      uuid references public.meat_products (id) on delete set null,
  name            text not null,
  unit_price_usd  numeric(12,2) not null,
  quantity        int not null check (quantity > 0),
  line_total_usd  numeric(12,2) not null,
  created_at      timestamptz not null default now()
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_org_idx on public.order_items (organization_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.order_items enable row level security;

-- Buyers may read their own orders (in addition to the org-member policy from 0006).
create policy orders_select_buyer on public.orders
  for select using (buyer_id = auth.uid());

-- order_items: seller org members, the buyer, or platform admins.
create policy order_items_select on public.order_items
  for select using (
    public.is_org_member(organization_id)
    or buyer_id = auth.uid()
    or public.is_platform_admin()
  );

-- ── place_order: create a pending_payment order, reserve inventory atomically ─
create or replace function public.place_order(p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user    uuid := auth.uid();
  v_org     uuid;
  v_item    jsonb;
  v_product public.meat_products%rowtype;
  v_qty     int;
  v_total   numeric := 0;
  v_order   uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'EMPTY_CART'; end if;

  -- Pass 1: lock products, validate availability + inventory, snapshot prices.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty <= 0 then raise exception 'INVALID_QUANTITY'; end if;

    select * into v_product from public.meat_products
      where id = (v_item->>'product_id')::uuid for update;
    if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
    if v_product.status <> 'active' then raise exception 'PRODUCT_UNAVAILABLE'; end if;
    if v_product.price_usd is null then raise exception 'PRICE_NOT_SET'; end if;

    if v_org is null then
      v_org := v_product.organization_id;
    elsif v_org <> v_product.organization_id then
      raise exception 'MULTIPLE_SELLERS';
    end if;

    if v_product.inventory is not null and v_product.inventory < v_qty then
      raise exception 'INSUFFICIENT_INVENTORY:%', v_product.name;
    end if;

    v_total := v_total + v_product.price_usd * v_qty;
  end loop;

  insert into public.orders (organization_id, buyer_id, buyer_email, status, total_usd, currency)
  values (v_org, v_user,
          (select email from public.profiles where id = v_user),
          'pending_payment', v_total, 'usd')
  returning id into v_order;

  -- Pass 2: decrement inventory (rows still locked) and write line items.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::int;
    select * into v_product from public.meat_products
      where id = (v_item->>'product_id')::uuid for update;
    if v_product.inventory is not null then
      update public.meat_products set inventory = inventory - v_qty where id = v_product.id;
    end if;
    insert into public.order_items
      (order_id, organization_id, buyer_id, product_id, name, unit_price_usd, quantity, line_total_usd)
    values (v_order, v_org, v_user, v_product.id, v_product.name,
            v_product.price_usd, v_qty, v_product.price_usd * v_qty);
  end loop;

  insert into public.audit_logs (actor_id, organization_id, action, entity_type, entity_id, metadata)
  values (v_user, v_org, 'order.created', 'order', v_order, jsonb_build_object('total', v_total));

  return jsonb_build_object('order_id', v_order, 'total', v_total, 'organization_id', v_org);
end;
$$;

-- ── mark_order_paid: webhook-only (service role); idempotent status flip ──────
create or replace function public.mark_order_paid(p_order uuid, p_session text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_org uuid; v_changed int;
begin
  update public.orders
    set status = 'paid', paid_at = now(),
        stripe_checkout_session_id = coalesce(p_session, stripe_checkout_session_id)
    where id = p_order and status = 'pending_payment'
    returning organization_id into v_org;
  get diagnostics v_changed = row_count;
  if v_changed > 0 then
    insert into public.audit_logs (organization_id, action, entity_type, entity_id, metadata)
    values (v_org, 'order.paid', 'order', p_order, '{}'::jsonb);
  end if;
end;
$$;

-- ── cancel_order: buyer or seller-admin; only while unpaid; restores inventory ─
create or replace function public.cancel_order(p_order uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_order public.orders%rowtype; v_item public.order_items%rowtype;
begin
  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if not (v_order.buyer_id = auth.uid() or public.is_org_admin(v_order.organization_id)) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if v_order.status <> 'pending_payment' then return; end if; -- idempotent / unpaid only

  for v_item in select * from public.order_items where order_id = p_order loop
    if v_item.product_id is not null then
      update public.meat_products set inventory = inventory + v_item.quantity
        where id = v_item.product_id and inventory is not null;
    end if;
  end loop;

  update public.orders set status = 'cancelled', canceled_at = now() where id = p_order;
  insert into public.audit_logs (actor_id, organization_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), v_order.organization_id, 'order.cancelled', 'order', p_order, '{}'::jsonb);
end;
$$;

-- ── fulfill_order: seller-admin; paid -> fulfilled ───────────────────────────
create or replace function public.fulfill_order(p_order uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_org uuid; v_status public.order_status;
begin
  select organization_id, status into v_org, v_status from public.orders where id = p_order;
  if v_org is null then raise exception 'ORDER_NOT_FOUND'; end if;
  if not public.is_org_admin(v_org) then raise exception 'NOT_AUTHORIZED'; end if;
  if v_status <> 'paid' then raise exception 'NOT_PAID'; end if;

  update public.orders set status = 'fulfilled', fulfilled_at = now() where id = p_order;
  insert into public.audit_logs (actor_id, organization_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), v_org, 'order.fulfilled', 'order', p_order, '{}'::jsonb);
end;
$$;

-- ── refund_order: seller-admin; paid/fulfilled -> refunded; restores inventory ─
-- (The Stripe refund API call is made by app code; this records the state.)
create or replace function public.refund_order(p_order uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_order public.orders%rowtype; v_item public.order_items%rowtype;
begin
  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if not public.is_org_admin(v_order.organization_id) then raise exception 'NOT_AUTHORIZED'; end if;
  if v_order.status not in ('paid', 'fulfilled') then raise exception 'NOT_REFUNDABLE'; end if;

  for v_item in select * from public.order_items where order_id = p_order loop
    if v_item.product_id is not null then
      update public.meat_products set inventory = inventory + v_item.quantity
        where id = v_item.product_id and inventory is not null;
    end if;
  end loop;

  update public.orders set status = 'refunded', refunded_at = now() where id = p_order;
  insert into public.audit_logs (actor_id, organization_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), v_order.organization_id, 'order.refunded', 'order', p_order, '{}'::jsonb);
end;
$$;

-- ── expire_order: webhook-only; cancels an unpaid order + restores inventory ──
-- Called on checkout.session.expired. No auth.uid() in webhook context, so it
-- skips the buyer/admin check that cancel_order performs.
create or replace function public.expire_order(p_order uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_order public.orders%rowtype; v_item public.order_items%rowtype;
begin
  select * into v_order from public.orders where id = p_order for update;
  if not found then return; end if;
  if v_order.status <> 'pending_payment' then return; end if; -- idempotent

  for v_item in select * from public.order_items where order_id = p_order loop
    if v_item.product_id is not null then
      update public.meat_products set inventory = inventory + v_item.quantity
        where id = v_item.product_id and inventory is not null;
    end if;
  end loop;

  update public.orders set status = 'cancelled', canceled_at = now() where id = p_order;
  insert into public.audit_logs (organization_id, action, entity_type, entity_id, metadata)
  values (v_order.organization_id, 'order.expired', 'order', p_order, '{}'::jsonb);
end;
$$;

-- Sensitive RPCs (grant "money"/inventory status). Service role only.
revoke execute on function public.mark_order_paid(uuid, text) from public;
revoke execute on function public.expire_order(uuid) from public;
