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
ADMIN_ORDER_EMAIL=
ALLOW_CUSTOMER_EMAILS=false
EMAIL_DEBUG=false
```

## Resend Sender Requirement

`RESEND_FROM_EMAIL` must be a verified sender/domain in Resend.

- Do not use personal Gmail addresses unless your Resend setup explicitly verifies/sends from that address.
- Recommended format: `orders@yourdomain.com`.
- If `RESEND_FROM_EMAIL` is empty or uses common consumer domains (for example `gmail.com`), the app falls back to `onboarding@resend.dev` to keep checkout email flow testable.
- In fallback mode (`onboarding@resend.dev`), only the admin order email is sent by default. Set `ALLOW_CUSTOMER_EMAILS=true` to also attempt customer emails.

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
