# Claude Project Memory: MUGEN DISTRICT

This file is the working memory for this repository.

If you are Claude Code, read this before making changes.
If you are Claude in a Project/chat, use this file plus [README.md](/Users/qtv/drip-store/README.md) as the primary source of truth.

## Project Snapshot

- Project name: `MUGEN DISTRICT`
- Repo path: `/Users/qtv/drip-store`
- Stack: Next.js App Router, React 19, TypeScript, Tailwind/PostCSS, Supabase, Resend
- Primary domain: `https://mugendistrict.com`
- Product type: anime/streetwear ecommerce-style storefront with a manual order flow
- Brand premise: West African grit + Neo-Tokyo aesthetics, archive energy, limited drops, no mass restocks

## What The Site Currently Is

This is not a standard automated Shopify-style checkout.

The live flow is:

1. User browses the archive/store/product pages.
2. User adds pieces to cart.
3. User submits shipping details on `/checkout`.
4. `POST /api/orders/create` validates product data against Supabase, creates the order, inserts order items, and attempts emails.
5. User lands on `/success` with an order reference.
6. User is prompted to confirm via WhatsApp or phone.
7. Payment and delivery are handled manually afterward.

Important: `src/app/api/checkout/route.ts` is intentionally deprecated and returns `410`.
The real checkout path is `POST /api/orders/create`.

## Information Architecture

- `/` redirects to `/archive`
- `/archive` is the real landing page and brand entry point
- `/store` shows all products with search
- `/limited` filters limited pieces
- `/new` filters new pieces
- `/product/[id]` is the product detail experience
- `/cart` is the client cart
- `/checkout` collects shipping info and places manual orders
- `/success` shows the archived order confirmation state and WhatsApp/call actions
- `/about` explains the brand world
- `/privacy`, `/refunds`, `/terms` are present and production-facing
- `/admin/login` and `/admin/orders` are the lightweight admin tools

## Current Brand And UX Rules

Protect these unless the user explicitly wants a rebrand:

- Tone is confident, sparse, and stylized, not corporate.
- The archive framing matters more than generic ecommerce language.
- "Limited", "archive", "drop", "enter the mugen", and "no restocks" are core vocabulary.
- The visual language is deliberate and dramatic, especially on `/archive`.
- The site identity is rooted in The Gambia + Tokyo/Shibuya/Neo-Tokyo references.
- Avoid turning the experience into a bland template storefront.

## Product Catalog Model

Primary catalog logic lives in [src/lib/products.ts](/Users/qtv/drip-store/src/lib/products.ts).

Key facts:

- There is a base in-repo product catalog (`ALL_PRODUCTS` / base product objects).
- Supabase inventory can override title, price, limited flag, stock, and sold counts.
- Product images prefer Supabase Storage when `NEXT_PUBLIC_PRODUCT_IMAGE_BASE_URL` or Supabase URL is available.
- Local fallback images live under `/archive/assets/products`.
- Limited items default to a stock model centered around `LIMITED_STOCK_QTY = 10`.
- Product pages and grids use live merged inventory from [src/lib/products-server.ts](/Users/qtv/drip-store/src/lib/products-server.ts).

Current archive messaging on the landing page says:

- `ARCHIVE DROP 001`
- `Drop 001 — Five pieces. Three limited. No restocks.`

Treat that as user-facing canon unless the user asks to change it.

## Launch Gate Logic

Launch behavior is important and has been refined multiple times.

Source of truth:

- [src/lib/launch.ts](/Users/qtv/drip-store/src/lib/launch.ts)
- [src/hooks/useLaunchLive.ts](/Users/qtv/drip-store/src/hooks/useLaunchLive.ts)
- [src/components/TrustedNowProvider.tsx](/Users/qtv/drip-store/src/components/TrustedNowProvider.tsx)
- [src/app/api/now/route.ts](/Users/qtv/drip-store/src/app/api/now/route.ts)

Rules:

- Launch date defaults to April 30 UTC of the current year if no env override is set.
- `NEXT_PUBLIC_LAUNCH_AT` / `LAUNCH_AT` can set the launch date.
- `NEXT_PUBLIC_FORCE_LAUNCH_LIVE` / `FORCE_LAUNCH_LIVE` can force the store live.
- `NEXT_PUBLIC_FORCE_LAUNCH_LIVE_UNTIL` / `FORCE_LAUNCH_LIVE_UNTIL` can temporarily override launch lock.
- Limited product UI should show stock messaging before launch without falsely marking products sold out.
- Cross-device launch consistency matters. The app now syncs against trusted server time instead of relying purely on the client clock.

Do not casually rewrite launch logic. It was explicitly fixed on April 1, 2026 to avoid lock-state mismatches across devices.

## Cart And Checkout

Main files:

- [src/lib/cart.ts](/Users/qtv/drip-store/src/lib/cart.ts)
- [src/app/cart/page.tsx](/Users/qtv/drip-store/src/app/cart/page.tsx)
- [src/app/checkout/page.tsx](/Users/qtv/drip-store/src/app/checkout/page.tsx)
- [src/app/api/orders/create/route.ts](/Users/qtv/drip-store/src/app/api/orders/create/route.ts)
- [src/lib/order-success.ts](/Users/qtv/drip-store/src/lib/order-success.ts)
- [src/lib/whatsapp.ts](/Users/qtv/drip-store/src/lib/whatsapp.ts)

Behavior:

- Cart state is client-side and syncs across tabs with storage/custom events.
- Checkout sanitizes shipping fields on the client and server.
- The order create route validates prices and products from Supabase, not just from client payloads.
- The order create route rate-limits requests.
- The route is designed so order creation can still succeed even if email delivery fails.
- Success state stores and displays an order reference like `MGN-XXXXXXXX`.
- Success page encourages WhatsApp confirmation and also exposes a call action on mobile.

Important operational truth:

- This is a manual fulfillment flow, not a card payment flow.
- Preserve the WhatsApp/manual follow-up pattern unless the user asks to replace it.

## Email And Notifications

Main files:

- [src/lib/email/send.ts](/Users/qtv/drip-store/src/lib/email/send.ts)
- [src/lib/email/templates.ts](/Users/qtv/drip-store/src/lib/email/templates.ts)
- [src/lib/orders/email-state.ts](/Users/qtv/drip-store/src/lib/orders/email-state.ts)
- [src/app/api/newsletter/route.ts](/Users/qtv/drip-store/src/app/api/newsletter/route.ts)

Current behavior:

- Resend is used for transactional email.
- Order creation can send admin and customer messages.
- Email status is tracked and normalized.
- Customer email failure should not block order creation.
- Newsletter signups persist first, then try best-effort emails.
- Resend testing restrictions were explicitly handled in the order/newsletter flows.

Important:

- `RESEND_FROM_EMAIL` must be a verified sender.
- Debug routes must stay disabled in production unless explicitly enabled.

## Waitlist And Newsletter

There are two related but separate collection flows:

- Newsletter:
  - Route: [src/app/api/newsletter/route.ts](/Users/qtv/drip-store/src/app/api/newsletter/route.ts)
  - Persists into `public.waitlist` with `source='newsletter'`
  - Sends best-effort admin/customer emails

- Waitlist:
  - Route: [src/app/api/waitlist/route.ts](/Users/qtv/drip-store/src/app/api/waitlist/route.ts)
  - Used for pre-launch/drop-alert capture from store/product contexts
  - Allowed sources are currently `store` and `product`
  - Persists contact + optional `product_sku`

Both flows are rate-limited and treat duplicate entries as success.

## Admin Flow

Main files:

- [src/lib/admin-auth.ts](/Users/qtv/drip-store/src/lib/admin-auth.ts)
- [src/app/admin/login/page.tsx](/Users/qtv/drip-store/src/app/admin/login/page.tsx)
- [src/app/admin/orders/page.tsx](/Users/qtv/drip-store/src/app/admin/orders/page.tsx)
- [src/app/api/admin/login/route.ts](/Users/qtv/drip-store/src/app/api/admin/login/route.ts)
- [src/app/api/admin/logout/route.ts](/Users/qtv/drip-store/src/app/api/admin/logout/route.ts)
- [src/app/api/admin/orders/[id]/route.ts](/Users/qtv/drip-store/src/app/api/admin/orders/%5Bid%5D/route.ts)

Current model:

- Single-admin style auth via env vars
- Email + PBKDF2-SHA256 password hash
- Signed session cookie
- CSRF protection for admin actions
- Admin orders page shows latest 20 orders
- Admin can confirm, cancel, or delete orders
- Completed orders are locked from confirm/cancel and should be deleted instead if needed
- Auth is fail-closed when required env vars are missing

## Supabase Expectations

This repo assumes Supabase is the backend source for:

- `products`
- `orders`
- `order_items`
- `waitlist`

The app also assumes RPC/database support for the order insertion flow.

Read [README.md](/Users/qtv/drip-store/README.md) for the migration list and env setup.

Important implementation pattern:

- The app can fall back gracefully when Supabase inventory snapshots are unavailable.
- But production behavior expects Supabase to be correctly configured.

## Environment And Security Notes

Read the root README before touching deployment or auth.

High-sensitivity env/config areas:

- Supabase URL and keys
- Resend API key and sender config
- `ADMIN_LOGIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`
- launch override env vars

Important safety rules already encoded in the project:

- Admin auth fails closed when env is incomplete.
- Debug routes are disabled in production by default.
- Secret leakage should be treated as credential compromise and rotated.
- Website DNS and email DNS are intentionally documented separately.

## Commands

- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Start: `npm run start`
- Lint: `npm run lint`
- Tests: `npm test`
- Generate admin password hash: `npm run admin:hash`

## Recent Timeline

This timeline is based on git history plus current code. Many commits are named `update site`, so when intent was unclear, this summary is inferred from the resulting code.

- 2026-02-24: Bootstrapped from Create Next App.
- 2026-02-25: The repo became `drip-store`, with the first real store/cart/checkout/product pages and supporting components.
- 2026-02-25: Home was changed to redirect away from a generic landing page toward the shopping experience.
- 2026-02-25: Archive/product/cart routing issues were fixed.
- 2026-02-27: Resend test-mode behavior and success redirect logic were fixed so manual order confirmation worked more reliably.
- 2026-03-01: Supabase checkout RPC support was repaired/enabled for the order flow.
- 2026-03-01: Legal pages (`/privacy`, `/refunds`, `/terms`) and reusable legal links were added.
- 2026-03-01: Brand favicon/icons replaced the default app favicon.
- 2026-03-11: Mobile navbar spacing was fixed.
- 2026-04-01: Launch lock state was fixed across devices by introducing trusted server time synchronization and stronger launch-date parsing/tests.
- 2026-04-14: Launch readiness/admin flow polish landed, including major `globals.css` styling work, product image handling cleanup, and product image tests.

## Working Agreements For Future Changes

When editing this repo, keep these truths intact unless the user asks otherwise:

- Preserve the Mugen District voice and world-building.
- Do not replace the archive-led landing experience with a generic ecommerce hero.
- Do not assume automated card payments exist.
- Do not reintroduce `POST /api/checkout` as the primary order path unless the user explicitly wants that architecture.
- Do not break launch gating or trusted-time sync.
- Do not make limited items look sold out before launch unless that is intended.
- Do not make email delivery a hard dependency for order creation success.
- Do not weaken admin auth, CSRF, or secret handling.
- Prefer reading current code over assuming older commit intent, because many commit messages are generic.

## Best Entry Points For New Work

If you need to understand the app quickly, start here:

1. [README.md](/Users/qtv/drip-store/README.md)
2. [src/app/archive/page.tsx](/Users/qtv/drip-store/src/app/archive/page.tsx)
3. [src/lib/products.ts](/Users/qtv/drip-store/src/lib/products.ts)
4. [src/lib/products-server.ts](/Users/qtv/drip-store/src/lib/products-server.ts)
5. [src/lib/launch.ts](/Users/qtv/drip-store/src/lib/launch.ts)
6. [src/app/checkout/page.tsx](/Users/qtv/drip-store/src/app/checkout/page.tsx)
7. [src/app/api/orders/create/route.ts](/Users/qtv/drip-store/src/app/api/orders/create/route.ts)
8. [src/lib/admin-auth.ts](/Users/qtv/drip-store/src/lib/admin-auth.ts)

## If More History Is Needed

This file captures the current state and the clearest milestones.
For finer-grained archaeology, inspect:

- `git log --reverse --date=short --pretty=format:'%ad %h %s'`
- milestone commits like `30b4190`, `274ed1c`, `a749111`, `cdbd7de`

Because many historical commits are labeled `update site`, exact intent sometimes has to be inferred from the final code and migration history rather than commit messages alone.
