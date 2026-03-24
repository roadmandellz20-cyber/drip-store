begin;

create table if not exists public.request_rate_limits (
  bucket_key text primary key,
  hits integer not null default 0,
  reset_at timestamptz not null default now(),
  blocked_until timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists request_rate_limits_reset_at_idx
  on public.request_rate_limits (reset_at);

create index if not exists request_rate_limits_blocked_until_idx
  on public.request_rate_limits (blocked_until);

alter table public.request_rate_limits enable row level security;

revoke all on table public.request_rate_limits from public, anon, authenticated;
grant all on table public.request_rate_limits to service_role;

create or replace function public.consume_rate_limit(
  p_bucket_key text,
  p_window_seconds integer,
  p_max_requests integer,
  p_block_seconds integer default null,
  p_increment boolean default true
)
returns table(
  allowed boolean,
  retry_after_seconds integer,
  hit_count integer,
  reset_at timestamptz,
  blocked_until timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_seconds integer := greatest(coalesce(p_window_seconds, 0), 1);
  v_max_requests integer := greatest(coalesce(p_max_requests, 0), 1);
  v_block_seconds integer := greatest(coalesce(p_block_seconds, p_window_seconds, 0), 1);
  v_reset_at timestamptz := v_now + make_interval(secs => v_window_seconds);
  v_blocked_until timestamptz := v_now + make_interval(secs => v_block_seconds);
  v_row public.request_rate_limits%rowtype;
  v_next_hits integer;
begin
  if p_bucket_key is null or btrim(p_bucket_key) = '' then
    raise exception 'bucket key is required';
  end if;

  if random() < 0.01 then
    delete from public.request_rate_limits
    where coalesce(blocked_until, reset_at) < (v_now - interval '2 days');
  end if;

  select *
  into v_row
  from public.request_rate_limits
  where bucket_key = p_bucket_key
  for update;

  if not found then
    if not p_increment then
      return query
      select true, 0, 0, v_reset_at, null::timestamptz;
      return;
    end if;

    insert into public.request_rate_limits (
      bucket_key,
      hits,
      reset_at,
      blocked_until,
      created_at,
      updated_at
    )
    values (
      p_bucket_key,
      1,
      v_reset_at,
      null,
      v_now,
      v_now
    );

    return query
    select true, 0, 1, v_reset_at, null::timestamptz;
    return;
  end if;

  if v_row.blocked_until is not null and v_row.blocked_until > v_now then
    return query
    select
      false,
      greatest(1, ceil(extract(epoch from (v_row.blocked_until - v_now)))::integer),
      v_row.hits,
      v_row.reset_at,
      v_row.blocked_until;
    return;
  end if;

  if v_row.reset_at <= v_now then
    if not p_increment then
      update public.request_rate_limits
      set
        hits = 0,
        reset_at = v_reset_at,
        blocked_until = null,
        updated_at = v_now
      where bucket_key = p_bucket_key;

      return query
      select true, 0, 0, v_reset_at, null::timestamptz;
      return;
    end if;

    update public.request_rate_limits
    set
      hits = 1,
      reset_at = v_reset_at,
      blocked_until = null,
      updated_at = v_now
    where bucket_key = p_bucket_key;

    return query
    select true, 0, 1, v_reset_at, null::timestamptz;
    return;
  end if;

  if not p_increment then
    return query
    select true, 0, v_row.hits, v_row.reset_at, null::timestamptz;
    return;
  end if;

  v_next_hits := coalesce(v_row.hits, 0) + 1;

  if v_next_hits > v_max_requests then
    update public.request_rate_limits
    set
      hits = v_next_hits,
      blocked_until = v_blocked_until,
      updated_at = v_now
    where bucket_key = p_bucket_key;

    return query
    select
      false,
      greatest(1, ceil(extract(epoch from (v_blocked_until - v_now)))::integer),
      v_next_hits,
      v_row.reset_at,
      v_blocked_until;
    return;
  end if;

  update public.request_rate_limits
  set
    hits = v_next_hits,
    updated_at = v_now
  where bucket_key = p_bucket_key;

  return query
  select true, 0, v_next_hits, v_row.reset_at, null::timestamptz;
end;
$$;

revoke execute on function public.consume_rate_limit(text, integer, integer, integer, boolean)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer, integer, boolean)
  to service_role;

with ranked_waitlist as (
  select
    ctid,
    row_number() over (
      partition by lower(contact), source, coalesce(product_sku, '')
      order by created_at asc, id asc
    ) as row_num
  from public.waitlist
)
delete from public.waitlist w
using ranked_waitlist r
where w.ctid = r.ctid
  and r.row_num > 1;

create unique index if not exists waitlist_contact_source_product_unique_idx
  on public.waitlist (lower(contact), source, coalesce(product_sku, ''));

notify pgrst, 'reload schema';

commit;
