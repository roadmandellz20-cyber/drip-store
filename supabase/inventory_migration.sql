alter table if exists public.products
  add column if not exists is_limited boolean default false;

alter table if exists public.products
  add column if not exists stock_qty integer;

alter table if exists public.products
  add column if not exists sold_qty integer default 0;

alter table if exists public.products
  alter column is_limited set default false;

alter table if exists public.products
  alter column sold_qty set default 0;

update public.products
set sold_qty = coalesce(sold_qty, 0);

update public.products
set
  is_limited = true,
  stock_qty = 7,
  sold_qty = coalesce(sold_qty, 0)
where slug in ('ulquiorra-01', 'luffy-01', 'ichigo-01');

update public.products
set
  is_limited = false,
  stock_qty = null,
  sold_qty = coalesce(sold_qty, 0)
where slug not in ('ulquiorra-01', 'luffy-01', 'ichigo-01');
