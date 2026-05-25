-- Demo seed data for a believable public environment.
--
-- Run with the SERVICE ROLE (bypasses RLS), e.g. in the Supabase SQL editor or:
--   psql "$DATABASE_URL" -f supabase/seed.sql
--
-- Creates two demo organizations with PUBLIC listings, beef products, and a
-- live + an upcoming auction, so /listings, /beef, and /auctions are populated
-- for anonymous visitors. Idempotent (ON CONFLICT DO NOTHING). Demo orgs have
-- no owner/auth user — they exist for public display only. Safe to delete:
--   delete from public.organizations where id in
--     ('d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002');

begin;

insert into public.organizations (id, name, slug, business_type) values
  ('d0000000-0000-0000-0000-000000000001', 'Cross Creek Cattle Co.', 'cross-creek-cattle', 'ranch'),
  ('d0000000-0000-0000-0000-000000000002', 'High Plains Sale Barn', 'high-plains-sale-barn', 'auction_house')
on conflict (id) do nothing;

insert into public.ranch_profiles (organization_id, display_name, bio, location, is_public) values
  ('d0000000-0000-0000-0000-000000000001', 'Cross Creek Cattle Co.',
   'Family-run registered Angus operation since 1974.', 'Ellis County, KS', true),
  ('d0000000-0000-0000-0000-000000000002', 'High Plains Sale Barn',
   'Weekly cattle sales and special production auctions.', 'Custer County, MT', true)
on conflict (organization_id) do nothing;

insert into public.livestock_listings
  (id, organization_id, title, species, breed, quantity, price_usd, location, seller_name, status) values
  ('d1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
   'Registered Black Angus bred heifers', 'cattle', 'Black Angus', 24, 2850, 'Ellis County, KS', 'Cross Creek Cattle Co.', 'active'),
  ('d1000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001',
   'Commercial Hereford steers, weaned', 'cattle', 'Hereford', 60, 1450, 'Ellis County, KS', 'Cross Creek Cattle Co.', 'active'),
  ('d1000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001',
   'Charolais herd bull, 2 yr, semen tested', 'cattle', 'Charolais', 1, 6500, 'Ellis County, KS', 'Cross Creek Cattle Co.', 'active')
on conflict (id) do nothing;

insert into public.meat_products
  (id, organization_id, name, product_type, price_usd, unit, inventory, seller_name, status) values
  ('d2000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
   'Grass-fed quarter beef', 'quarter', 4.75, 'lb hanging weight', 8, 'Cross Creek Cattle Co.', 'active'),
  ('d2000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001',
   'Half beef share', 'half', 4.50, 'lb hanging weight', 4, 'Cross Creek Cattle Co.', 'active'),
  ('d2000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001',
   'Ribeye bundle (10 lb)', 'bundle', 199, 'bundle', 20, 'Cross Creek Cattle Co.', 'active')
on conflict (id) do nothing;

-- A live auction (open for bidding) and an upcoming one.
insert into public.auctions (id, organization_id, title, description, location, status, starts_at, ends_at) values
  ('d3000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002',
   'Friday Night Cattle Sale', 'Replacement females and feeder cattle.', 'Custer County, MT',
   'live', now() - interval '1 hour', now() + interval '2 days'),
  ('d3000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002',
   'Spring Production Sale', 'Registered bulls and bred heifers.', 'Custer County, MT',
   'scheduled', now() + interval '7 days', now() + interval '7 days' + interval '4 hours')
on conflict (id) do nothing;

insert into public.auction_lots
  (id, auction_id, organization_id, lot_number, title, species, head_count, opening_bid_usd, reserve_price_usd, bid_increment_usd, closes_at) values
  ('d4000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002',
   1, 'Fancy Angus-cross replacement heifers', 'cattle', 18, 1900, 2300, 50, now() + interval '2 days'),
  ('d4000000-0000-0000-0000-000000000002', 'd3000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002',
   2, 'Red Angus bred cows, 3-5 yr', 'cattle', 32, 2100, 2500, 50, now() + interval '2 days'),
  ('d4000000-0000-0000-0000-000000000003', 'd3000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002',
   3, 'Weaned Charolais-cross steers', 'cattle', 45, 1250, null, 25, now() + interval '2 days')
on conflict (id) do nothing;

commit;
