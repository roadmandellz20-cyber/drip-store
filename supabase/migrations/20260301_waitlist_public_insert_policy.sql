grant usage on schema public to anon, authenticated;
grant insert on table public.waitlist to anon, authenticated;

drop policy if exists waitlist_public_insert on public.waitlist;

create policy waitlist_public_insert
on public.waitlist
for insert
to anon, authenticated
with check (true);

notify pgrst, 'reload schema';
