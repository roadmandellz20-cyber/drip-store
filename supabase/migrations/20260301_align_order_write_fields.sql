-- Align checkout RPC writes with the live orders schema.
-- Safe to run multiple times.

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

alter table if exists public.orders
  add column if not exists order_number text;

alter table if exists public.orders
  add column if not exists status text default 'pending';

alter table if exists public.orders
  add column if not exists shipping_address jsonb;

alter table if exists public.orders
  add column if not exists total_price_cents integer default 0;

alter table if exists public.orders
  add column if not exists note text;

alter table if exists public.orders
  alter column note set default '';

alter table if exists public.order_items
  add column if not exists product_slug text;

alter table if exists public.order_items
  add column if not exists unit_price_cents integer;

alter table if exists public.order_items
  add column if not exists line_total_cents integer;

alter table if exists public.order_items
  add column if not exists currency text;

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

update public.orders
set total_price_cents = coalesce(total_cents, 0)
where coalesce(total_price_cents, 0) = 0
  and coalesce(total_cents, 0) > 0;

update public.orders
set shipping_address = jsonb_build_object('formatted', customer_address)
where shipping_address is null
  and btrim(coalesce(customer_address, '')) <> '';

update public.orders
set note = ''
where note is null;

create or replace function public.create_manual_order_with_inventory(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_customer_address text,
  p_delivery_note text,
  p_currency text,
  p_total_cents integer,
  p_idempotency_key text,
  p_items jsonb
)
returns table(order_id uuid, reused boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id uuid;
  v_order_id uuid;
  v_out_of_stock_title text;
begin
  if p_idempotency_key is not null and btrim(p_idempotency_key) <> '' then
    select o.id
    into v_existing_id
    from public.orders o
    where o.idempotency_key = p_idempotency_key
    limit 1;

    if v_existing_id is not null then
      return query select v_existing_id, true;
      return;
    end if;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty.';
  end if;

  create temp table _mugen_order_lines (
    product_id uuid not null,
    product_slug text,
    title text not null,
    price_cents integer not null,
    qty integer not null,
    size text,
    currency text
  ) on commit drop;

  insert into _mugen_order_lines (
    product_id,
    product_slug,
    title,
    price_cents,
    qty,
    size,
    currency
  )
  select
    x.product_id,
    nullif(btrim(x.product_slug), ''),
    x.title,
    x.price_cents,
    greatest(1, x.qty),
    nullif(btrim(x.size), ''),
    upper(coalesce(nullif(btrim(x.currency), ''), p_currency, 'GMD'))
  from jsonb_to_recordset(p_items) as x(
    product_id uuid,
    product_slug text,
    title text,
    price_cents integer,
    qty integer,
    size text,
    currency text
  );

  if exists (
    select 1
    from _mugen_order_lines
    where product_id is null
      or btrim(coalesce(title, '')) = ''
      or price_cents is null
      or price_cents <= 0
      or qty is null
      or qty <= 0
  ) then
    raise exception 'Invalid order items.';
  end if;

  perform 1
  from public.products p
  join (
    select product_id, sum(qty)::integer as requested_qty
    from _mugen_order_lines
    group by product_id
  ) requested on requested.product_id = p.id
  where coalesce(p.is_limited, false)
  for update of p;

  select p.title
  into v_out_of_stock_title
  from public.products p
  join (
    select product_id, sum(qty)::integer as requested_qty
    from _mugen_order_lines
    group by product_id
  ) requested on requested.product_id = p.id
  where coalesce(p.is_limited, false)
    and greatest(coalesce(p.stock_qty, 7) - coalesce(p.sold_qty, 0), 0) < requested.requested_qty
  order by p.title
  limit 1;

  if v_out_of_stock_title is not null then
    raise exception 'OUT_OF_STOCK:Insufficient stock for %', v_out_of_stock_title;
  end if;

  begin
    insert into public.orders (
      order_number,
      status,
      customer_name,
      customer_email,
      customer_phone,
      customer_address,
      shipping_address,
      note,
      delivery_note,
      total_cents,
      total_price_cents,
      currency,
      idempotency_key
    )
    values (
      public.next_order_number(),
      'pending',
      p_customer_name,
      p_customer_email,
      p_customer_phone,
      p_customer_address,
      case
        when nullif(btrim(p_customer_address), '') is null then null
        else jsonb_build_object('formatted', p_customer_address)
      end,
      coalesce(nullif(btrim(p_delivery_note), ''), ''),
      nullif(btrim(p_delivery_note), ''),
      p_total_cents,
      p_total_cents,
      upper(coalesce(nullif(btrim(p_currency), ''), 'GMD')),
      nullif(btrim(p_idempotency_key), '')
    )
    returning id into v_order_id;
  exception
    when unique_violation then
      if p_idempotency_key is not null and btrim(p_idempotency_key) <> '' then
        select o.id
        into v_existing_id
        from public.orders o
        where o.idempotency_key = p_idempotency_key
        limit 1;

        if v_existing_id is not null then
          return query select v_existing_id, true;
          return;
        end if;
      end if;

      raise;
  end;

  insert into public.order_items (
    order_id,
    product_id,
    product_slug,
    title,
    unit_price_cents,
    price_cents,
    size,
    qty,
    line_total_cents,
    currency
  )
  select
    v_order_id,
    product_id,
    product_slug,
    title,
    price_cents,
    price_cents,
    size,
    qty,
    price_cents * qty,
    currency
  from _mugen_order_lines;

  update public.products p
  set sold_qty = coalesce(p.sold_qty, 0) + requested.requested_qty
  from (
    select product_id, sum(qty)::integer as requested_qty
    from _mugen_order_lines
    group by product_id
  ) requested
  where p.id = requested.product_id
    and coalesce(p.is_limited, false);

  return query select v_order_id, false;
end;
$$;

notify pgrst, 'reload schema';
