-- Add per-customer confirmation email delivery state.
-- Safe to run multiple times.

alter table if exists public.orders
  add column if not exists customer_email_status text;

alter table if exists public.orders
  add column if not exists customer_email_error text;

alter table if exists public.orders
  add column if not exists customer_email_sent_at timestamptz;

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
