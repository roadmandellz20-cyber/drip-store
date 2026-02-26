-- MASTER SCHEMA ALIGNMENT FIX — MUGEN DISTRICT
-- Idempotent migration for orders schema + deterministic order_number generation + product seed.

create extension if not exists pgcrypto;

-- =========================
-- Orders schema alignment
-- =========================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text,
  customer_name text,
  customer_email text,
  customer_phone text,
  customer_address text,
  delivery_note text,
  currency text default 'GMD',
  total_cents integer default 0,
  created_at timestamptz default now()
);

alter table if exists public.orders
  add column if not exists order_number text;

alter table if exists public.orders
  add column if not exists customer_name text;

alter table if exists public.orders
  add column if not exists customer_email text;

alter table if exists public.orders
  add column if not exists customer_phone text;

alter table if exists public.orders
  add column if not exists customer_address text;

alter table if exists public.orders
  add column if not exists delivery_note text;

alter table if exists public.orders
  add column if not exists currency text;

alter table if exists public.orders
  add column if not exists total_cents integer;

alter table if exists public.orders
  add column if not exists created_at timestamptz default now();

-- Keep idempotency support for duplicate-submit protection.
alter table if exists public.orders
  add column if not exists idempotency_key text;

-- Ensure defaults
alter table if exists public.orders
  alter column created_at set default now();

-- Deterministic sequence for order numbers
create sequence if not exists public.order_number_seq
  start with 1
  increment by 1
  minvalue 1
  no maxvalue
  cache 1;

create or replace function public.next_order_number()
returns text
language plpgsql
as $$
declare
  seq_value bigint;
  year_part text;
begin
  seq_value := nextval('public.order_number_seq');
  year_part := extract(year from now())::text;
  return 'MGN-' || year_part || '-' || lpad(seq_value::text, 6, '0');
end;
$$;

-- Backfill missing order_number values
update public.orders
set order_number = public.next_order_number()
where order_number is null or btrim(order_number) = '';

-- Constraint/index safety
create unique index if not exists orders_order_number_unique
  on public.orders(order_number);

create unique index if not exists orders_idempotency_key_unique
  on public.orders(idempotency_key)
  where idempotency_key is not null;

-- Optional hardening: make key fields non-null when safe
alter table if exists public.orders
  alter column currency set default 'GMD';

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid,
  title text not null,
  price_cents integer not null,
  size text,
  qty integer not null default 1,
  created_at timestamptz default now()
);

-- =========================
-- Products schema alignment
-- =========================
alter table if exists public.products
  add column if not exists slug text;

alter table if exists public.products
  add column if not exists title text;

alter table if exists public.products
  add column if not exists description text;

alter table if exists public.products
  add column if not exists price_cents integer;

alter table if exists public.products
  add column if not exists currency text default 'GMD';

alter table if exists public.products
  add column if not exists image_url text;

alter table if exists public.products
  add column if not exists image_main text;

alter table if exists public.products
  add column if not exists image_alt text;

alter table if exists public.products
  add column if not exists status text default 'AVAILABLE';

alter table if exists public.products
  add column if not exists tagline text;

alter table if exists public.products
  add column if not exists is_active boolean default true;

create unique index if not exists products_slug_unique
  on public.products(slug)
  where slug is not null;

-- =========================
-- Seed / upsert 5 required products
-- =========================
with seed(slug, title, price_cents, currency, description, image_url, status, is_active, tagline) as (
  values
    (
      'luffy-01',
      'One Piece Legacy Panel Tee (Black)',
      200000,
      'GMD',
      'Built for true pirates. Multi-panel One Piece artwork with premium streetwear finish.',
      '/archive/assets/luffy-01.jpg',
      'LIMITED',
      true,
      'ENTER THE MUGEN.'
    ),
    (
      'luffy-02',
      'Gear 5 Luffy Collage Tee (Black)',
      150000,
      'GMD',
      'Gear 5 collage graphic with layered manga details and bold street silhouette.',
      '/archive/assets/luffy-02.jpg',
      'AVAILABLE',
      true,
      'ENTER THE MUGEN.'
    ),
    (
      'ichigo-01',
      'Ichigo Hollow Grunge Tee (White Distressed)',
      200000,
      'GMD',
      'Distressed Ichigo Hollow collage with Japanese typography and underground finish.',
      '/archive/assets/ichigo-01.jpg',
      'LIMITED',
      true,
      'ENTER THE MUGEN.'
    ),
    (
      'ichigo-02',
      'Tensa Zangetsu Fragment Tee (White Distressed)',
      150000,
      'GMD',
      'Tensa Zangetsu panel composition with torn textures and editorial streetwear shape.',
      '/archive/assets/ichigo-02.jpg',
      'AVAILABLE',
      true,
      'ENTER THE MUGEN.'
    ),
    (
      'ulquiorra-01',
      'Ulquiorra Segunda Etapa Tee (Black)',
      200000,
      'GMD',
      'Monochrome Ulquiorra composition with dark archival tone and sharp print presence.',
      '/archive/assets/ulquiorra-01.jpg',
      'LIMITED',
      true,
      'ENTER THE MUGEN.'
    )
)
update public.products p
set
  title = s.title,
  description = s.description,
  price_cents = s.price_cents,
  currency = s.currency,
  image_url = s.image_url,
  image_main = coalesce(p.image_main, s.image_url),
  image_alt = coalesce(p.image_alt, s.image_url),
  status = s.status,
  is_active = s.is_active,
  tagline = s.tagline
from seed s
where p.slug = s.slug;

with seed(slug, title, price_cents, currency, description, image_url, status, is_active, tagline) as (
  values
    (
      'luffy-01',
      'One Piece Legacy Panel Tee (Black)',
      200000,
      'GMD',
      'Built for true pirates. Multi-panel One Piece artwork with premium streetwear finish.',
      '/archive/assets/luffy-01.jpg',
      'LIMITED',
      true,
      'ENTER THE MUGEN.'
    ),
    (
      'luffy-02',
      'Gear 5 Luffy Collage Tee (Black)',
      150000,
      'GMD',
      'Gear 5 collage graphic with layered manga details and bold street silhouette.',
      '/archive/assets/luffy-02.jpg',
      'AVAILABLE',
      true,
      'ENTER THE MUGEN.'
    ),
    (
      'ichigo-01',
      'Ichigo Hollow Grunge Tee (White Distressed)',
      200000,
      'GMD',
      'Distressed Ichigo Hollow collage with Japanese typography and underground finish.',
      '/archive/assets/ichigo-01.jpg',
      'LIMITED',
      true,
      'ENTER THE MUGEN.'
    ),
    (
      'ichigo-02',
      'Tensa Zangetsu Fragment Tee (White Distressed)',
      150000,
      'GMD',
      'Tensa Zangetsu panel composition with torn textures and editorial streetwear shape.',
      '/archive/assets/ichigo-02.jpg',
      'AVAILABLE',
      true,
      'ENTER THE MUGEN.'
    ),
    (
      'ulquiorra-01',
      'Ulquiorra Segunda Etapa Tee (Black)',
      200000,
      'GMD',
      'Monochrome Ulquiorra composition with dark archival tone and sharp print presence.',
      '/archive/assets/ulquiorra-01.jpg',
      'LIMITED',
      true,
      'ENTER THE MUGEN.'
    )
)
insert into public.products (
  slug,
  title,
  description,
  price_cents,
  currency,
  image_url,
  image_main,
  image_alt,
  status,
  is_active,
  tagline
)
select
  s.slug,
  s.title,
  s.description,
  s.price_cents,
  s.currency,
  s.image_url,
  s.image_url,
  s.image_url,
  s.status,
  s.is_active,
  s.tagline
from seed s
where not exists (
  select 1 from public.products p where p.slug = s.slug
);
