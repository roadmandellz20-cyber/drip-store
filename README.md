# MUGEN DISTRICT (Next.js + Supabase)

## Setup

1. Copy `.env.example` to `.env.local`.
2. Fill all values.
3. Generate `ADMIN_PASSWORD_HASH` using PBKDF2-SHA256 and set `ADMIN_SESSION_SECRET`.
4. Run dev server:

```bash
npm install
npm run dev
```

## Build Verification

Use the default production build first:

```bash
npm run build
```

In restricted sandboxes, the build can fail while processing `src/app/globals.css` because the PostCSS worker may need local port binding. If that happens, rerun `npm run build` outside the sandbox.

## Required Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

RESEND_API_KEY=
RESEND_FROM_EMAIL=
RESEND_CUSTOMER_FROM_EMAIL=
RESEND_REPLY_TO=support@mugendistrict.com
RESEND_FROM_NAME=Mugen District
ADMIN_ORDER_EMAIL=
EMAIL_DEBUG=false
ENABLE_DEBUG_ROUTES=false

ADMIN_LOGIN_EMAIL=
ADMIN_PASSWORD_HASH=
ADMIN_SESSION_SECRET=
```

`ADMIN_PASSWORD_HASH` format:

```text
pbkdf2_sha256$<iterations>$<salt_base64>$<hash_base64>
```

## Admin Password Hash Generation

Use this one-time Node command to produce a compatible hash:

```bash
node --input-type=module -e "const c=await import('node:crypto');const salt=c.randomBytes(16);const iterations=210000;const password=process.argv[1];if(!password){throw new Error('Pass password as arg');}const hash=c.pbkdf2Sync(password,salt,iterations,32,'sha256');console.log(`pbkdf2_sha256$${iterations}$${salt.toString('base64')}$${hash.toString('base64')}`);" 'YOUR_ADMIN_PASSWORD'
```

## Security Notes

- Admin auth is fail-closed. If `ADMIN_LOGIN_EMAIL`, `ADMIN_PASSWORD_HASH`, or `ADMIN_SESSION_SECRET` are missing, login/session validation will fail.
- `/api/debug` and `/api/debug/email` are disabled in production and only enabled when `ENABLE_DEBUG_ROUTES=true` in non-production.
- `api/checkout` is intentionally deprecated and returns HTTP `410`.

## Secret Handling (`.env.local`)

Treat `.env.local` as sensitive material:

- Never commit `.env.local`.
- If `.env.local` is ever shared, uploaded, copied to chat, or checked into git history, assume compromise immediately.
- Rotate all leaked credentials at provider level:
  - Supabase service-role key
  - Supabase anon key
  - Resend API key
  - Admin session secret
  - Admin password hash (regenerate from new password)

## Resend Sender Requirement

`RESEND_FROM_EMAIL` must be a verified sender/domain in Resend.

- Do not use personal Gmail addresses unless your Resend setup explicitly verifies/sends from that address.
- Required sender: `Mugen District <orders@mugendistrict.com>`.
- `RESEND_CUSTOMER_FROM_EMAIL` is optional and falls back to `RESEND_FROM_EMAIL`.
- `RESEND_REPLY_TO` can point to `support@mugendistrict.com` or your preferred support inbox.
- Do not use `onboarding@resend.dev` in production.

## DNS Separation (Vercel + Resend)

Keep website DNS and email DNS separate to avoid SSL or delivery regressions.

- Website (Vercel): keep `A @ -> <Vercel IP>` and `CNAME www -> <Vercel CNAME>`.
- Do not add conflicting `A`/`CNAME` records for `@` or `www`.
- Resend email DNS:
  - `TXT resend._domainkey = p=...` (DKIM)
  - `TXT send = v=spf1 include:amazonses.com ~all` (SPF)
  - `MX send = feedback-smtp.eu-west-1.amazonses.com` (priority `10`)
  - `TXT _dmarc = v=DMARC1; p=none;`

## Delivery Validation Checklist

- Send test email to Gmail and Outlook.
- Verify it does not consistently land in spam.
- Check raw headers for `SPF=pass` and `DKIM=pass`.
- Confirm Resend response IDs are present in logs.
- Add Resend webhooks for bounces/complaints in a follow-up iteration.

## Checkout Order Flow

- Frontend submits shipping + cart to `POST /api/orders/create`.
- Backend validates products/prices from Supabase.
- Backend inserts `orders` + `order_items` through RPC.
- Backend attempts customer/admin email via Resend.
- Email failures do not fail order creation.

## Newsletter Signup Flow

- Frontend submits email to `POST /api/newsletter`.
- Backend persists signup in `public.waitlist` with `source='newsletter'`.
- Admin/customer emails are best-effort after persistence.

## Migrations

Run SQL files in `supabase/migrations/` in order:

- `20260226_manual_orders.sql`
- `20260226_critical_alignment_and_seed.sql`
- `20260226_master_schema_alignment.sql`
- `20260301_waitlist.sql`
- `20260301_waitlist_public_insert_policy.sql`
- `20260302_align_catalog_prices.sql`
- `20260302_customer_order_email_state.sql`
- `20260311_security_hardening.sql`
- `20260324_update_limited_inventory_to_10.sql`
- `20260324_security_abuse_hardening.sql`
