-- MUGEN DISTRICT: orders schema alignment for /api/orders/create
-- Run this in Supabase SQL Editor.
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  customer_phone text,
  customer_address text,
  note text,
  total_cents integer default 0,
  currency text default 'GMD',
  created_at timestamptz default now()
);

alter table if exists public.orders
  add column if not exists customer_email text;

alter table if exists public.orders
  add column if not exists delivery_note text;

alter table if exists public.orders
  add column if not exists idempotency_key text;

alter table if exists public.orders
  add column if not exists order_number text;

alter table if exists public.orders
  add column if not exists email_status text;

alter table if exists public.orders
  add column if not exists email_error text;

alter table if exists public.orders
  add column if not exists customer_email_status text;

alter table if exists public.orders
  add column if not exists customer_email_error text;

alter table if exists public.orders
  add column if not exists customer_email_sent_at timestamptz;

alter table if exists public.orders
  add column if not exists created_at timestamptz default now();

alter table if exists public.orders
  alter column created_at set default now();

alter table if exists public.orders
  alter column total_cents set default 0;

alter table if exists public.orders
  alter column currency set default 'GMD';

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

update public.orders
set order_number = public.next_order_number()
where order_number is null or btrim(order_number) = '';

with ranked as (
  select
    id,
    order_number,
    row_number() over (partition by order_number order by created_at nulls last, id) as rn
  from public.orders
  where order_number is not null
)
update public.orders o
set order_number = public.next_order_number()
from ranked r
where o.id = r.id and r.rn > 1;

create unique index if not exists orders_order_number_unique
  on public.orders(order_number)
  where order_number is not null;

create unique index if not exists orders_idempotency_key_unique
  on public.orders(idempotency_key)
  where idempotency_key is not null;

update public.orders
set
  customer_email_status = 'sent',
  customer_email_error = null,
  customer_email_sent_at = coalesce(customer_email_sent_at, created_at)
where coalesce(btrim(customer_email_status), '') = ''
  and lower(coalesce(email_status, '')) = 'sent';

update public.orders
set
  customer_email_status = 'failed',
  customer_email_error = coalesce(customer_email_error, email_error)
where coalesce(btrim(customer_email_status), '') = ''
  and lower(coalesce(email_status, '')) = 'failed';

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table if exists public.order_items
  add column if not exists product_id uuid;

alter table if exists public.order_items
  add column if not exists title text;

alter table if exists public.order_items
  add column if not exists price_cents integer;

alter table if exists public.order_items
  add column if not exists size text;

alter table if exists public.order_items
  add column if not exists qty integer;

alter table if exists public.order_items
  alter column qty set default 1;

create index if not exists order_items_order_id_idx
  on public.order_items(order_id);

-- Refresh PostgREST schema cache (Supabase API).
notify pgrst, 'reload schema';
