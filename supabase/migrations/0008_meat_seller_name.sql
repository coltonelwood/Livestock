-- 0008 — Denormalize seller_name onto meat_products (parity with
-- livestock_listings) so public D2C pages can show the ranch name without
-- exposing the organizations table to anonymous readers.

alter table public.meat_products
  add column if not exists seller_name text;
