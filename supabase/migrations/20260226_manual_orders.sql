-- MUGEN DISTRICT manual checkout hardening

create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now()
);

create unique index if not exists customers_email_key on public.customers (lower(email));

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text,
  status text not null default 'pending',
  idempotency_key text,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text,
  customer_email text,
  customer_phone text,
  customer_address text,
  shipping_name text,
  shipping_email text,
  shipping_phone text,
  shipping_address_line1 text,
  shipping_address_line2 text,
  shipping_city text,
  shipping_region text,
  shipping_postal_code text,
  shipping_country text,
  delivery_note text,
  note text,
  total_cents integer not null default 0,
  currency text not null default 'GMD',
  created_at timestamptz not null default now()
);

create unique index if not exists orders_idempotency_key_unique
  on public.orders (idempotency_key)
  where idempotency_key is not null;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid,
  product_slug text,
  title text not null,
  unit_price_cents integer,
  price_cents integer not null,
  qty integer not null default 1,
  size text,
  line_total_cents integer,
  currency text,
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);

alter table if exists public.products add column if not exists title text;
alter table if exists public.products add column if not exists slug text;
alter table if exists public.products add column if not exists description text;
alter table if exists public.products add column if not exists price_cents integer;
alter table if exists public.products add column if not exists currency text default 'GMD';
alter table if exists public.products add column if not exists image_main text;
alter table if exists public.products add column if not exists image_alt text;
alter table if exists public.products add column if not exists status text default 'AVAILABLE';
alter table if exists public.products add column if not exists tagline text;
alter table if exists public.products add column if not exists is_active boolean default true;

alter table if exists public.orders add column if not exists idempotency_key text;
alter table if exists public.orders add column if not exists customer_email text;
alter table if exists public.orders add column if not exists shipping_name text;
alter table if exists public.orders add column if not exists shipping_email text;
alter table if exists public.orders add column if not exists shipping_phone text;
alter table if exists public.orders add column if not exists shipping_address_line1 text;
alter table if exists public.orders add column if not exists shipping_address_line2 text;
alter table if exists public.orders add column if not exists shipping_city text;
alter table if exists public.orders add column if not exists shipping_region text;
alter table if exists public.orders add column if not exists shipping_postal_code text;
alter table if exists public.orders add column if not exists shipping_country text;
alter table if exists public.orders add column if not exists delivery_note text;
alter table if exists public.orders add column if not exists order_number text;
alter table if exists public.orders add column if not exists status text default 'pending';

alter table if exists public.order_items add column if not exists title text;
alter table if exists public.order_items add column if not exists unit_price_cents integer;
alter table if exists public.order_items add column if not exists line_total_cents integer;
alter table if exists public.order_items add column if not exists currency text;
alter table if exists public.order_items add column if not exists product_slug text;
