-- Demo seed: a believable, active marketplace across several ranches/states.
-- Run with the SERVICE ROLE. Idempotent (ON CONFLICT DO NOTHING) — safe to
-- re-run; existing rows are left as-is and new ones are added.
--
-- Demo orgs have no owner/auth user; they exist for public display only. Remove
-- with: delete from public.organizations where id like 'd0000000-%';

begin;

-- ── Ranches (organizations) ───────────────────────────────────────────────────
insert into public.organizations (id, name, slug, business_type) values
  ('d0000000-0000-0000-0000-000000000001', 'Cross Creek Cattle Co.', 'cross-creek-cattle', 'ranch'),
  ('d0000000-0000-0000-0000-000000000002', 'High Plains Sale Barn', 'high-plains-sale-barn', 'auction_house'),
  ('d0000000-0000-0000-0000-000000000003', 'Bar 7 Ranch', 'bar-7-ranch', 'ranch'),
  ('d0000000-0000-0000-0000-000000000004', 'Willow Bend Angus', 'willow-bend-angus', 'breeder'),
  ('d0000000-0000-0000-0000-000000000005', 'Sandhill Cattle Co.', 'sandhill-cattle', 'ranch')
on conflict (id) do nothing;

insert into public.ranch_profiles (organization_id, display_name, bio, location, is_public) values
  ('d0000000-0000-0000-0000-000000000001', 'Cross Creek Cattle Co.', 'Family-run registered Angus since 1974.', 'Ellis County, KS', true),
  ('d0000000-0000-0000-0000-000000000002', 'High Plains Sale Barn', 'Weekly cattle sales and special production auctions.', 'Custer County, MT', true),
  ('d0000000-0000-0000-0000-000000000003', 'Bar 7 Ranch', 'Brangus and F1 females built for hot, dry country.', 'Llano County, TX', true),
  ('d0000000-0000-0000-0000-000000000004', 'Willow Bend Angus', 'AI-sired registered Angus seedstock. Bulls and bred females.', 'Holt County, NE', true),
  ('d0000000-0000-0000-0000-000000000005', 'Sandhill Cattle Co.', 'Running-age cows and grass-efficient feeders.', 'Tripp County, SD', true)
on conflict (organization_id) do nothing;

-- ── Livestock listings ────────────────────────────────────────────────────────
insert into public.livestock_listings
  (id, organization_id, title, description, species, breed, quantity, price_usd, location, seller_name, status) values
  ('d1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Registered Black Angus bred heifers', 'AI-bred to a calving-ease sire, due to start in March. Vaccinated and poured.', 'cattle', 'Black Angus', 24, 2850, 'Ellis County, KS', 'Cross Creek Cattle Co.', 'active'),
  ('d1000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Commercial Hereford steers, weaned', '45 days weaned, bunk broke, two rounds of shots. Avg 575 lb.', 'cattle', 'Hereford', 60, 1450, 'Ellis County, KS', 'Cross Creek Cattle Co.', 'active'),
  ('d1000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'Charolais herd bull, 2 yr', 'Semen tested and ready to go to work. Gentle disposition.', 'cattle', 'Charolais', 1, 6500, 'Ellis County, KS', 'Cross Creek Cattle Co.', 'active'),
  ('d1000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-000000000001', 'Hereford x Angus baldy heifers', 'True F1 baldies, uniform set. Bangs vaccinated.', 'cattle', 'Hereford-Angus', 26, 2500, 'Ellis County, KS', 'Cross Creek Cattle Co.', 'active'),
  ('d1000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000003', 'Brangus 3-in-1 pairs', 'Cow, calf at side, and rebred. Heat- and fly-tolerant.', 'cattle', 'Brangus', 15, 3200, 'Llano County, TX', 'Bar 7 Ranch', 'active'),
  ('d1000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000003', 'F1 Tigerstripe replacement heifers', 'Hard-doing Brahman-Hereford cross. Built for tough country.', 'cattle', 'F1 Tigerstripe', 22, 2650, 'Llano County, TX', 'Bar 7 Ranch', 'active'),
  ('d1000000-0000-0000-0000-000000000013', 'd0000000-0000-0000-0000-000000000004', 'Registered Angus yearling bulls', 'Top 10% for marbling and calving ease. Sound feet, fertility tested.', 'cattle', 'Black Angus', 8, 5500, 'Holt County, NE', 'Willow Bend Angus', 'active'),
  ('d1000000-0000-0000-0000-000000000014', 'd0000000-0000-0000-0000-000000000004', 'Bred Angus heifers, AI-sired', 'Synchronized and AI-bred, cleanup with low-birthweight bulls.', 'cattle', 'Black Angus', 30, 2750, 'Holt County, NE', 'Willow Bend Angus', 'active'),
  ('d1000000-0000-0000-0000-000000000015', 'd0000000-0000-0000-0000-000000000005', 'Red Angus bred cows, running age', 'Solid running-age cows, fall calving. Gentle, easy keeping.', 'cattle', 'Red Angus', 40, 2100, 'Tripp County, SD', 'Sandhill Cattle Co.', 'active'),
  ('d1000000-0000-0000-0000-000000000016', 'd0000000-0000-0000-0000-000000000005', 'Charolais-cross feeder steers, 650 lb', 'Green grass cattle, never been hot. Big-framed and growthy.', 'cattle', 'Charolais-cross', 80, 1380, 'Tripp County, SD', 'Sandhill Cattle Co.', 'active'),
  ('d1000000-0000-0000-0000-000000000017', 'd0000000-0000-0000-0000-000000000004', 'Fullblood Wagyu herd sire prospect', 'Registered fullblood, exceptional marbling pedigree.', 'cattle', 'Wagyu', 1, 9500, 'Holt County, NE', 'Willow Bend Angus', 'active')
on conflict (id) do nothing;

-- Enrich the original listings with descriptions if they have none.
update public.livestock_listings set description = 'AI-bred to a calving-ease sire, due to start in March.'
  where id = 'd1000000-0000-0000-0000-000000000001' and description is null;

-- ── Beef products (DTC) ───────────────────────────────────────────────────────
insert into public.meat_products
  (id, organization_id, name, description, product_type, price_usd, unit, inventory, seller_name, status) values
  ('d2000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Grass-fed quarter beef', 'About 110 lbs packaged. Dry-aged 21 days. Custom cut sheet.', 'quarter', 4.75, 'lb hanging weight', 8, 'Cross Creek Cattle Co.', 'active'),
  ('d2000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Half beef share', 'About 220 lbs packaged. You pick the cuts.', 'half', 4.50, 'lb hanging weight', 4, 'Cross Creek Cattle Co.', 'active'),
  ('d2000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'Ribeye bundle (10 lb)', 'Ten pounds of hand-cut, dry-aged ribeye steaks.', 'bundle', 199, 'bundle', 20, 'Cross Creek Cattle Co.', 'active'),
  ('d2000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-000000000004', 'Wagyu burger box (10 lb)', 'Ground fullblood Wagyu, 1 lb packs. Unreal flavor.', 'bundle', 129, 'bundle', 15, 'Willow Bend Angus', 'active'),
  ('d2000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000003', 'Ground beef bundle (20 lb)', 'Twenty 1-lb packs, 90/10 lean. Pasture-raised.', 'bundle', 149, 'bundle', 30, 'Bar 7 Ranch', 'active'),
  ('d2000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000005', 'Whole beef share', 'A full beef, ~440 lbs packaged. Best value per pound.', 'whole', 4.25, 'lb hanging weight', 2, 'Sandhill Cattle Co.', 'active')
on conflict (id) do nothing;

-- ── Auctions + lots ───────────────────────────────────────────────────────────
insert into public.auctions (id, organization_id, title, description, location, status, starts_at, ends_at) values
  ('d3000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'Friday Night Feeder Sale', 'Weekly run of feeder cattle and replacement females.', 'Custer County, MT', 'live', now() - interval '1 hour', now() + interval '2 days'),
  ('d3000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'Fall Replacement Female Sale', 'Bred cows and heifers from area ranches.', 'Custer County, MT', 'scheduled', now() + interval '9 days', now() + interval '9 days' + interval '4 hours'),
  ('d3000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000004', 'Willow Bend Spring Bull Sale', '60 registered Angus bulls sell. Volume discounts.', 'Holt County, NE', 'scheduled', now() + interval '21 days', now() + interval '21 days' + interval '3 hours')
on conflict (id) do nothing;

insert into public.auction_lots
  (id, auction_id, organization_id, lot_number, title, species, head_count, opening_bid_usd, reserve_price_usd, bid_increment_usd, closes_at) values
  ('d4000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 1, 'Fancy Angus-cross replacement heifers', 'cattle', 18, 1900, 2300, 50, now() + interval '2 days'),
  ('d4000000-0000-0000-0000-000000000002', 'd3000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 2, 'Red Angus bred cows, 3-5 yr', 'cattle', 32, 2100, 2500, 50, now() + interval '2 days'),
  ('d4000000-0000-0000-0000-000000000003', 'd3000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 3, 'Weaned Charolais-cross steers', 'cattle', 45, 1250, null, 25, now() + interval '2 days'),
  ('d4000000-0000-0000-0000-000000000004', 'd3000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 4, 'Black baldy yearling heifers', 'cattle', 60, 1600, null, 25, now() + interval '2 days')
on conflict (id) do nothing;

commit;
