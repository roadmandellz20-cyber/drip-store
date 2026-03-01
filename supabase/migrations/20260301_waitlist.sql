create extension if not exists pgcrypto;

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  contact text not null,
  source text not null,
  product_sku text null
);

create index if not exists waitlist_created_at_idx on public.waitlist (created_at desc);
create index if not exists waitlist_source_idx on public.waitlist (source);
create index if not exists waitlist_product_sku_idx on public.waitlist (product_sku);

alter table public.waitlist enable row level security;
