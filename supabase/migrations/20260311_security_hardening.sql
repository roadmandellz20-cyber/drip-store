-- Security hardening migration
-- - Enforce RLS on sensitive tables
-- - Remove anon/authenticated access from orders/order_items/products
-- - Tighten waitlist insert policy
-- - Restrict SECURITY DEFINER RPC execution to service_role

begin;

alter table if exists public.orders enable row level security;
alter table if exists public.order_items enable row level security;
alter table if exists public.products enable row level security;
alter table if exists public.waitlist enable row level security;

revoke all on table public.orders from anon, authenticated;
revoke all on table public.order_items from anon, authenticated;
revoke all on table public.products from anon, authenticated;
revoke all on table public.waitlist from anon, authenticated;

grant insert (contact, source, product_sku) on table public.waitlist to anon, authenticated;

drop policy if exists waitlist_public_insert on public.waitlist;

create policy waitlist_public_insert
on public.waitlist
for insert
to anon, authenticated
with check (
  char_length(contact) between 3 and 254
  and contact ~* '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
  and source in ('store', 'product', 'newsletter')
  and (
    product_sku is null
    or (
      char_length(product_sku) between 1 and 64
      and product_sku ~ '^[a-z0-9-]+$'
    )
  )
);

do $$
begin
  if to_regprocedure('public.create_manual_order_with_inventory(text,text,text,text,text,text,integer,text,jsonb)') is not null then
    revoke execute on function public.create_manual_order_with_inventory(text,text,text,text,text,text,integer,text,jsonb)
      from public, anon, authenticated;
    grant execute on function public.create_manual_order_with_inventory(text,text,text,text,text,text,integer,text,jsonb)
      to service_role;
  end if;

  if to_regprocedure('public.next_order_number()') is not null then
    revoke execute on function public.next_order_number() from public, anon, authenticated;
    grant execute on function public.next_order_number() to service_role;
  end if;
end
$$;

notify pgrst, 'reload schema';

commit;
