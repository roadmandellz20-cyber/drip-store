-- Normalize image columns on the products table.
-- The original schema used image_main / image_alt.
-- A later migration added image_url but it was not always applied.
-- This migration ensures all three exist and are kept in sync,
-- so the admin CMS and storefront code work regardless of which
-- prior migrations were applied.

alter table if exists public.products
  add column if not exists image_url text;

alter table if exists public.products
  add column if not exists image_main text;

alter table if exists public.products
  add column if not exists image_alt text;

-- Sync: fill any blank image_url from image_main / image_alt
update public.products
set image_url = coalesce(
  nullif(btrim(coalesce(image_url, '')), ''),
  nullif(btrim(coalesce(image_main, '')), ''),
  nullif(btrim(coalesce(image_alt, '')), '')
)
where image_url is null or btrim(image_url) = '';

-- Sync: fill any blank image_main from image_url / image_alt
update public.products
set image_main = coalesce(
  nullif(btrim(coalesce(image_main, '')), ''),
  nullif(btrim(coalesce(image_url, '')), ''),
  nullif(btrim(coalesce(image_alt, '')), '')
)
where image_main is null or btrim(image_main) = '';

-- Sync: fill any blank image_alt from image_url / image_main
update public.products
set image_alt = coalesce(
  nullif(btrim(coalesce(image_alt, '')), ''),
  nullif(btrim(coalesce(image_url, '')), ''),
  nullif(btrim(coalesce(image_main, '')), '')
)
where image_alt is null or btrim(image_alt) = '';
