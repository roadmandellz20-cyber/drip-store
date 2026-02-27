# MUGEN DISTRICT (Next.js + Supabase)

## Setup

1. Copy `.env.example` to `.env.local`.
2. Fill all values.
3. Run dev server:

```bash
npm install
npm run dev
```

## Required Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

RESEND_API_KEY=
RESEND_FROM_EMAIL=
RESEND_FROM_NAME=Mugen District
ADMIN_ORDER_EMAIL=
RESEND_DOMAIN_VERIFIED=false
EMAIL_DEBUG=false
```

## Resend Sender Requirement

`RESEND_FROM_EMAIL` must be a verified sender/domain in Resend.

- Do not use personal Gmail addresses unless your Resend setup explicitly verifies/sends from that address.
- Recommended format: `no-reply@yourdomain.com`.
- The app sends using `Mugen District <no-reply@yourdomain.com>` (customizable via `RESEND_FROM_NAME`).
- Customer emails are attempted only when `RESEND_DOMAIN_VERIFIED=true`.
- Admin order emails are always attempted to `ADMIN_ORDER_EMAIL`.

## DNS Separation (Vercel + Resend)

Keep website DNS and email DNS separate to avoid SSL or delivery regressions.

- Website (Vercel): keep `A @ -> <Vercel IP from Vercel Domains panel>` and `CNAME www -> <Vercel CNAME from Vercel Domains panel>`.
- Do not add extra conflicting `A`/`CNAME` records for `@` or `www`.
- Resend email DNS:
  - `TXT resend._domainkey = p=...` (DKIM)
  - `TXT send = v=spf1 include:amazonses.com ~all` (SPF)
  - `MX send = feedback-smtp.eu-west-1.amazonses.com` (priority `10`)
  - `TXT _dmarc = v=DMARC1; p=none;`
- If an `MX` was accidentally created as `TXT`, delete and recreate it as `MX`.

## Delivery Validation Checklist

- Send test email to Gmail and Outlook.
- Verify it does not consistently land in spam.
- Check raw headers for `SPF=pass` and `DKIM=pass`.
- Confirm `From` is your branded domain and no unexpected `via resend` style aliasing is shown.
- Confirm Resend response IDs are present in Vercel logs.
- Add Resend webhooks for bounces/complaints in a follow-up iteration.

## Checkout Order Flow

- Frontend submits shipping + cart to `POST /api/orders/create`.
- Backend validates products/prices from Supabase.
- Backend generates deterministic `order_number` server-side.
- Backend inserts `orders` + `order_items`.
- Backend attempts customer/admin email via Resend.
- Email failures do **not** fail order creation.
- API returns `{ order_id: "..." }`.
- Frontend redirects to `/success?order_id=...`.

## Migrations

Run SQL files in `supabase/migrations/` in order, then run `migrate_orders.sql` in Supabase SQL Editor for schema-cache-safe alignment.

- `20260226_manual_orders.sql`
- `20260226_critical_alignment_and_seed.sql`
- `20260226_master_schema_alignment.sql`
