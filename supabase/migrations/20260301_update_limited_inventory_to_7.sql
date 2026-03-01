update public.products
set
  stock_qty = 7,
  sold_qty = coalesce(sold_qty, 0)
where coalesce(is_limited, false);

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
      customer_name,
      customer_email,
      customer_phone,
      customer_address,
      delivery_note,
      total_cents,
      currency,
      idempotency_key
    )
    values (
      p_customer_name,
      p_customer_email,
      p_customer_phone,
      p_customer_address,
      p_delivery_note,
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
    title,
    price_cents,
    size,
    qty
  )
  select
    v_order_id,
    product_id,
    title,
    price_cents,
    size,
    qty
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
