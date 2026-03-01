-- Add limited inventory support

alter table public.products
add column if not exists is_limited boolean default false;

alter table public.products
add column if not exists stock_qty integer;

alter table public.products
add column if not exists sold_qty integer default 0;

-- Set LIMITED items (10 each)

update public.products
set
  is_limited = true,
  stock_qty = 10,
  sold_qty = coalesce(sold_qty, 0)
where slug in (
  'ulquiorra-01',
  'luffy-01',
  'ichigo-01'
);

-- Ensure others remain unlimited

update public.products
set
  is_limited = false,
  stock_qty = null
where slug not in (
  'ulquiorra-01',
  'luffy-01',
  'ichigo-01'
);
