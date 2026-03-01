-- MUGEN DISTRICT: waitlist schema alignment for /api/waitlist
-- Run this in Supabase SQL Editor.
-- Safe to run multiple times.

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

grant usage on schema public to anon, authenticated;
grant insert on table public.waitlist to anon, authenticated;

alter table public.waitlist enable row level security;

drop policy if exists waitlist_public_insert on public.waitlist;

create policy waitlist_public_insert
on public.waitlist
for insert
to anon, authenticated
with check (true);

notify pgrst, 'reload schema';
