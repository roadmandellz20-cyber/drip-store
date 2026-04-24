# Claude Project Memory: MUGEN DISTRICT

This file is the working memory for this repository.

If you are Claude Code, read this before making changes.
If you are Claude in a Project/chat, use this file plus [README.md](/Users/qtv/drip-store/README.md) as the primary source of truth.

## Project Snapshot

- Project name: `MUGEN DISTRICT`
- Repo path: `/Users/qtv/drip-store`
- Stack: Next.js App Router, React 19, TypeScript, Tailwind/PostCSS, Supabase, Resend
- Package name: `drip-store`
- Primary domain: `https://mugendistrict.com`
- Site type: anime/streetwear storefront with a manual post-order payment and fulfillment flow
- Brand premise: West African grit + Neo-Tokyo aesthetics, archive energy, limited drops, no mass restocks

## Core Truth

This is not a normal card-checkout ecommerce site.

The real flow is:

1. User enters through `/archive` and browses archive/store/product pages.
2. User adds products to the client-side cart.
3. User goes to `/checkout` and submits shipping details.
4. `POST /api/orders/create` validates products and pricing against Supabase, inserts the order, inserts order items, and attempts email.
5. User lands on `/success` with an order reference like `MGN-XXXXXXXX`.
6. User is told to confirm on WhatsApp or call.
7. Payment and delivery happen manually afterward.

Important:

- `src/app/api/checkout/route.ts` is intentionally deprecated and returns `410`.
- The real order endpoint is `POST /api/orders/create`.
- Email failure must not block successful order creation.
- Manual payment / manual follow-up is part of the current business model.

## Information Architecture

- `/` redirects to `/archive`
- `/archive` is the real landing page and brand entry point
- `/store` shows all products and search
- `/limited` shows limited products only
- `/new` shows new products only
- `/product/[id]` is the product detail experience
- `/cart` is the client cart page
- `/checkout` is the shipping + manual order submission page
- `/success` is the manual-confirmation / order-archived page
- `/about`, `/privacy`, `/refunds`, `/terms` are live production-facing pages
- `/admin/login` and `/admin/orders` are the lightweight admin tools

## Current Brand Canon

Protect this unless the user explicitly wants a rebrand:

- Tone is sparse, confident, stylized, and world-built, not corporate.
- The archive framing matters more than generic ecommerce language.
- Core vocabulary includes: `archive`, `drop`, `limited`, `no restocks`, `enter the mugen`.
- The identity is rooted in The Gambia + Tokyo / Shibuya / Neo-Tokyo references.
- The landing page should not feel like a generic template storefront.
- `/archive` is meant to feel dramatic and intentional, not like a simple category grid.

Current landing-page canon:

- Hero kicker: `ARCHIVE DROP 001`
- Hero title: `MUGEN DISTRICT`
- Hero subcopy: `Unlimited territory. An underground archive born in The Gambia, refined in the streets of Tokyo. Infinite energy—Zero limits.`
- Archive section note: `Drop 001 — Five pieces. Three limited. No restocks.`
- Footer manifesto frames the brand as the intersection of West African grit and Neo-Tokyo aesthetics, established 2026

## Current Product Canon

Source of truth:

- [src/lib/products.ts](/Users/qtv/drip-store/src/lib/products.ts)
- [src/lib/products-server.ts](/Users/qtv/drip-store/src/lib/products-server.ts)

There are currently 5 base catalog products:

- `luffy-02` — `Gear 5 Luffy Collage Tee (Black)` — GMD 1500 — new — not limited
- `luffy-01` — `One Piece Legacy Panel Tee (Black)` — GMD 2000 — limited
- `ichigo-01` — `Ichigo Hollow Grunge Tee (White Distressed)` — GMD 2000 — new — limited
- `ulquiorra-01` — `Ulquiorra Segunda Etapa Tee (Black)` — GMD 2000 — limited
- `ichigo-02` — `Tensa Zangetsu Fragment Tee (White Distressed)` — GMD 1500 — not limited

Catalog model facts:

- Base catalog lives in repo as `BASE_PRODUCTS` / `ALL_PRODUCTS`.
- Supabase inventory can override title, price, limited flag, stock, sold count, and availability.
- Product images prefer Supabase Storage when configured.
- Local fallback images live in `public/archive/assets/products`.
- `LIMITED_STOCK_QTY` is currently `10`.
- `NEW_PRODUCTS` and `LIMITED_PRODUCTS` are derived from the base catalog.

Important product behavior:

- Limited items show scarcity messaging.
- Before launch, limited items should show stock framing without appearing sold out.
- After launch, limited items can show `Only X left`, `Final piece`, or `SOLD OUT`.
- Product pages pull live inventory when possible, but can fall back to local catalog definitions.

## Launch Gate Logic

Source of truth:

- [src/lib/launch.ts](/Users/qtv/drip-store/src/lib/launch.ts)
- [src/hooks/useLaunchLive.ts](/Users/qtv/drip-store/src/hooks/useLaunchLive.ts)
- [src/components/TrustedNowProvider.tsx](/Users/qtv/drip-store/src/components/TrustedNowProvider.tsx)
- [src/app/api/now/route.ts](/Users/qtv/drip-store/src/app/api/now/route.ts)
- [src/lib/launch-copy.ts](/Users/qtv/drip-store/src/lib/launch-copy.ts)

Rules:

- Launch date defaults to April 30 UTC of the current year if no env override is set.
- `NEXT_PUBLIC_LAUNCH_AT` / `LAUNCH_AT` can override the launch date.
- `NEXT_PUBLIC_FORCE_LAUNCH_LIVE` / `FORCE_LAUNCH_LIVE` can force launch live.
- `NEXT_PUBLIC_FORCE_LAUNCH_LIVE_UNTIL` / `FORCE_LAUNCH_LIVE_UNTIL` can force launch live until a specific date.
- Cross-device launch consistency matters; trusted server time is used to avoid client-clock drift problems.

Current launch copy constants:

- Launch day text: `April 30`
- Locked button text: `LOCKED — Opens April 30`
- Locked stock note: `Opens April 30 (00:00)`
- Locked stock fallback: `DROPS APRIL 30`
- Locked promo text: `DROP LOCKED • OPENS APRIL 30 • LIMITED QTY • NO RESTOCKS`
- Live promo text: `DROP LIVE • SHIPS IN 24–48H • NO RESTOCKS`

Do not casually rewrite launch logic. It was explicitly hardened on April 1, 2026 to prevent mismatch across devices.

## Route Behavior Details

### `/archive`

- Real homepage / landing experience
- Uses `LaunchCountdown`
- Renders the full product grid
- Includes newsletter signup, social links, ticker, manifesto, and legal links

### `/store`

- Shows all live products
- Has client-side search by name or SKU
- Shows `GET DROP ALERT` button before launch
- Opens `WaitlistModal` with `source="store"` when launch is locked

### `/limited`

- Shows only products where `isLimited === true`

### `/new`

- Shows only products where `isNew === true`

### `/product/[id]`

- Product detail page with live product lookup and fallback lookup
- Metadata is generated from the product data
- Related products are computed from category / limited affinity
- Prelaunch state can show countdown and waitlist behavior
- Add-to-cart is blocked before launch using launch lock copy

### `/cart`

- Client-side cart page
- Cart state syncs across tabs with storage/custom events

### `/checkout`

- Requires cart items
- Collects `name`, `email`, `phone`, address fields, `country`, and optional `deliveryNote`
- Default country is `The Gambia`
- Uses idempotency keys for order creation
- Blocks submission when launch is locked
- Blocks submission when limited stock changed or sold out

### `/success`

- Shows `ORDER ARCHIVED`
- Displays order reference
- Tells user manual payment will follow
- Provides WhatsApp confirmation button
- Provides copy-details action
- Provides call button on mobile
- Business contact currently uses WhatsApp / phone number `+2203340558`

### `/admin/orders`

- Shows latest 20 orders
- Requires valid admin session
- Uses CSRF-protected forms for actions
- Supports confirm, cancel, and delete
- Completed orders are locked from confirm/cancel and should be deleted instead if needed

## Cart And Order Submission

Main files:

- [src/lib/cart.ts](/Users/qtv/drip-store/src/lib/cart.ts)
- [src/app/cart/page.tsx](/Users/qtv/drip-store/src/app/cart/page.tsx)
- [src/app/checkout/page.tsx](/Users/qtv/drip-store/src/app/checkout/page.tsx)
- [src/app/api/orders/create/route.ts](/Users/qtv/drip-store/src/app/api/orders/create/route.ts)
- [src/lib/order-success.ts](/Users/qtv/drip-store/src/lib/order-success.ts)
- [src/lib/whatsapp.ts](/Users/qtv/drip-store/src/lib/whatsapp.ts)

Important behavior:

- Cart is local/client-side state.
- Cart sync uses browser storage + custom events.
- Checkout sanitizes all shipping fields on both client and server.
- Order creation validates against Supabase product data, not only client payloads.
- Order creation is rate-limited.
- Order creation uses idempotency keys and can reuse an existing order for the same key.
- Limited inventory is enforced server-side.
- Order references are derived in the `MGN-XXXXXXXX` pattern.
- Successful order placement clears the cart and writes a local order-success summary.

## API Surface

### `POST /api/orders/create`

- Real order endpoint
- Node runtime
- Rate limit: 8 requests per 10 minutes, 15-minute block
- Validates products from Supabase
- Inserts order and order items
- Attempts customer and admin email
- Handles existing orders by idempotency key
- Returns `order_id`, `order_ref`, and email status fields

### `POST /api/newsletter`

- Persists email into `public.waitlist` with `source='newsletter'`
- Duplicate signups are treated as success
- Sends admin notification best-effort
- Sends customer confirmation best-effort
- Handles Resend test-mode restrictions explicitly
- Rate limit: 5 requests per 10 minutes, 15-minute block

### `POST /api/waitlist`

- Used for prelaunch/drop-alert signup from store or product flows
- Allowed sources are only `store` and `product`
- Accepts optional `productSku`
- Duplicate signups are treated as success
- Rate limit: 5 requests per 60 seconds, 5-minute block

### `POST /api/checkout`

- Deprecated on purpose
- Returns `410`
- Do not revive as the primary checkout path unless the user asks for an architecture change

### Debug routes

- `/api/debug`
- `/api/debug/email`

These must stay disabled in production unless explicitly enabled.

## Email And Notifications

Main files:

- [src/lib/email/send.ts](/Users/qtv/drip-store/src/lib/email/send.ts)
- [src/lib/email/templates.ts](/Users/qtv/drip-store/src/lib/email/templates.ts)
- [src/lib/orders/email-state.ts](/Users/qtv/drip-store/src/lib/orders/email-state.ts)
- [src/app/api/newsletter/route.ts](/Users/qtv/drip-store/src/app/api/newsletter/route.ts)

Operational truths:

- Resend is the mail provider.
- `RESEND_FROM_EMAIL` must be a verified sender.
- `RESEND_CUSTOMER_FROM_EMAIL` is optional and falls back to `RESEND_FROM_EMAIL`.
- `RESEND_REPLY_TO` is used as support/unsubscribe contact when applicable.
- Order creation can send both admin and customer mail.
- Newsletter signup can send both admin and customer mail.
- Customer email failure should not block order creation.
- Resend testing restrictions were explicitly handled in the code.
- Email delivery state is tracked and normalized.

## Waitlist And Newsletter

These flows are related but separate:

- Newsletter:
  - route: `/api/newsletter`
  - persists to `waitlist` with `source='newsletter'`
  - best-effort email notifications after persistence

- Waitlist:
  - route: `/api/waitlist`
  - used for prelaunch store/product drop alerts
  - allowed sources are `store` and `product`
  - persists contact plus optional `product_sku`

Both are rate-limited and duplicates are treated as success.

## Admin Auth Model

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
- Fail-closed behavior when required env vars are missing

## Supabase Expectations

Supabase is the backend source for:

- `products`
- `orders`
- `order_items`
- `waitlist`

Production expectations:

- Product validation and live inventory depend on Supabase
- Manual order insertion expects DB / RPC support matching the migrations
- The app can fall back in some product-display cases, but production behavior expects Supabase to be configured correctly

Run migrations from `supabase/migrations/` in order, as documented in [README.md](/Users/qtv/drip-store/README.md).

Important recent migration expectations include:

- manual orders schema
- catalog alignment / seed data
- waitlist tables + public insert policy
- customer order email state
- security hardening
- limited inventory quantity update to 10

## SEO / Site Meta

Main file:

- [src/lib/site.ts](/Users/qtv/drip-store/src/lib/site.ts)

Current constants:

- `SITE_NAME = "MUGEN DISTRICT"`
- `SITE_DESCRIPTION = "Anime streetwear from Mugen District. Limited archive pieces, no restocks, and Tokyo-grunge energy built for the drop."`
- `SITE_OG_IMAGE = "/archive/assets/hero-bg.jpg"`

Site URL resolution prefers:

1. `NEXT_PUBLIC_SITE_URL`
2. `SITE_URL`
3. `VERCEL_PROJECT_PRODUCTION_URL`
4. fallback `https://mugendistrict.com`

## Analytics

Main file:

- [src/lib/analytics.ts](/Users/qtv/drip-store/src/lib/analytics.ts)

Current analytics is lightweight and event-based.

Tracked event names:

- `view_product`
- `add_to_cart`
- `begin_checkout`
- `order_submitted`

It currently dispatches `window` custom events and logs to console. There is no heavy analytics vendor integration in this code path.

## Environment Variables

Required / important env vars from current setup:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_CUSTOMER_FROM_EMAIL`
- `RESEND_REPLY_TO`
- `RESEND_FROM_NAME`
- `ADMIN_ORDER_EMAIL`
- `EMAIL_DEBUG`
- `ENABLE_DEBUG_ROUTES`
- `ADMIN_LOGIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`

Launch-sensitive env vars:

- `NEXT_PUBLIC_LAUNCH_AT`
- `LAUNCH_AT`
- `NEXT_PUBLIC_FORCE_LAUNCH_LIVE`
- `FORCE_LAUNCH_LIVE`
- `NEXT_PUBLIC_FORCE_LAUNCH_LIVE_UNTIL`
- `FORCE_LAUNCH_LIVE_UNTIL`

Optional image / site env vars that influence behavior:

- `NEXT_PUBLIC_PRODUCT_IMAGE_BASE_URL`
- `NEXT_PUBLIC_SITE_URL`
- `SITE_URL`

## Security Notes

High-sensitivity areas:

- Supabase URL / keys
- Resend API key and sender config
- `ADMIN_LOGIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`
- launch override env vars

Safety rules already encoded in the project:

- Admin auth fails closed when env is incomplete.
- Debug routes are disabled in production by default.
- Secret leakage should be treated as credential compromise and rotated.
- Website DNS and email DNS are intentionally documented separately in the README.

## Commands

- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Start: `npm run start`
- Lint: `npm run lint`
- Tests: `npm test`
- Generate admin password hash: `npm run admin:hash`
- Playwright install: `npm run playwright:install`
- Playwright test: `npm run playwright:test`

## Tests / Verification Coverage

Current repo test coverage includes:

- email send logic
- email templates
- email-state normalization
- launch parsing / launch logic
- input sanitization
- product image helpers

Playwright also exists in the repo with at least one mobile-oriented spec:

- `tests/mobile-spot.spec.ts`

## Recent Timeline

This is inferred from the repo, README, migrations, and current code:

- 2026-02-24: Bootstrapped from Create Next App.
- 2026-02-25: Repo became the early storefront with store/cart/checkout/product flows.
- 2026-02-25: Home began redirecting toward the shopping/archive experience.
- 2026-02-27: Resend test-mode behavior and success redirect logic were improved.
- 2026-03-01: Supabase-backed manual-order checkout flow and supporting migrations were expanded.
- 2026-03-01: Legal pages and reusable legal links were added.
- 2026-03-11: Security / abuse hardening migrations landed.
- 2026-03-24: Limited inventory quantity was aligned to 10 and security hardening continued.
- 2026-04-01: Launch lock state was fixed across devices using trusted server time and better launch parsing.
- 2026-04-14: Product image handling, UI polish, and related tests were improved.

## Working Agreements For Future Changes

Keep these truths intact unless the user explicitly asks otherwise:

- Preserve the Mugen District voice and world-building.
- Do not replace the archive-led landing experience with a generic ecommerce hero.
- Do not assume card payments currently exist.
- Do not reintroduce `POST /api/checkout` as the primary order path unless requested.
- Do not break launch gating or trusted-time sync.
- Do not make limited items look sold out before launch unless that is the intended change.
- Do not make email delivery a hard dependency for order creation.
- Do not weaken admin auth, CSRF, or secret handling.
- Prefer reading current code over assuming older commit intent.

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

This file captures the current operating reality.
For finer-grained archaeology, inspect git history directly:

- `git log --reverse --date=short --pretty=format:'%ad %h %s'`

Because many historical commits are labeled `update site`, exact past intent is sometimes less reliable than the current code, migrations, and README.
