# Copilot instructions for MUGEN DISTRICT (drip-store)

Purpose: give future Copilot sessions the essential commands, high-level architecture, and repo-specific conventions needed to act usefully without digging through every file.

---

## Quick commands (build / test / lint)

- Install deps: npm install
- Dev server: npm run dev
- Production build: npm run build
- Run (production): npm run start
- Lint (project): npm run lint
  - Lint a single file: npx eslint <path/to/file>
- Tests (project uses Node's built-in test runner): npm test
  - Run a single test file: node --experimental-strip-types --test <path/to/testfile.ts>
    - Example: node --experimental-strip-types --test src/lib/launch.test.ts
- Admin hash helper: npm run admin:hash

Notes:
- The package.json `test` script invokes Node with a list of repo test files; use the direct node command above to target one file.

---

## High-level architecture (big picture)

- Framework: Next.js (App Router) + React 19 + TypeScript. Tailwind/PostCSS for styling.
- Backend: Supabase hosts product/inventory and order tables and provides RPC used by the order insertion flow.
- Email/notifications: Resend for transactional email (customer + admin). Email failures are non-fatal for order creation.
- Checkout & order flow:
  - The canonical route for placing orders is POST /api/orders/create (see src/app/api/orders/create/route.ts).
  - The legacy /api/checkout route is intentionally deprecated (returns 410).
  - Orders are created server-side after validating product/pricing against Supabase.
  - Success flow is manual: the site stores an order reference (MGN-XXXXXXXX) and prompts WhatsApp/phone confirmation; payment is handled outside automated card flows.
- Product catalog:
  - Base product catalog lives in src/lib/products.ts; server merge logic in src/lib/products-server.ts.
  - Product images prefer Supabase storage if env var NEXT_PUBLIC_PRODUCT_IMAGE_BASE_URL or Supabase is configured; local fallbacks under archive assets.
  - Limited items default to LIMITED_STOCK_QTY = 10.
- Launch gating:
  - Centralized in src/lib/launch.ts. Uses env overrides (NEXT_PUBLIC_LAUNCH_AT, NEXT_PUBLIC_FORCE_LAUNCH_LIVE, NEXT_PUBLIC_FORCE_LAUNCH_LIVE_UNTIL) and a trusted server time check.
  - Do not change launch gating lightly — cross-device consistency is important.
- Admin:
  - Single-admin model driven by env vars (ADMIN_LOGIN_EMAIL, ADMIN_PASSWORD_HASH, ADMIN_SESSION_SECRET).
  - Password hash format: pbkdf2_sha256$<iterations>$<salt_base64>$<hash_base64>

Primary entry points for investigating features: README.md, src/app/archive/page.tsx, src/lib/products.ts, src/lib/products-server.ts, src/lib/launch.ts, src/app/checkout/page.tsx, src/app/api/orders/create/route.ts, src/lib/admin-auth.ts

---

## Key repo conventions & non-obvious rules

- Manual fulfillment: treat the order flow as manual. The UX expects manual confirmation (WhatsApp/phone); do not convert it into an automated payment flow unless explicitly requested.
- Server-side validation: product prices, stock, and titles are authoritative when creating orders — always validate against Supabase on the server.
- Email is best-effort: order creation should succeed even when Resend/email delivery fails.
- Debug routes are gated by env flags (ENABLE_DEBUG_ROUTES); disabled in production by default.
- Admin auth is fail-closed: missing admin env vars will make login/session validation fail intentionally.
- Migrations live in supabase/ — apply them in order for DB changes.
- Launch logic is intentionally careful about time parsing/overrides — consult src/lib/launch.ts before changing behavior.
- Tests use Node's test runner (not Jest). Use the `node --experimental-strip-types --test` form to run files.
- Resend: RESEND_FROM_EMAIL must be a verified sender/domain.

---

## Existing AI / assistant docs to consult

- CLAUDE.md — project memory and working agreements. Copilot sessions should read this file early; it contains product rules, architecture notes, and sensitive guidance.

---

If you want this file expanded (more examples, common snippets, or automated MCP server setup for Playwright / browsers / testing), say which areas to cover and Copilot will add them.

---

## MCP servers (Playwright, Lighthouse, Storybook)

This project is a web app; the recommended MCP servers to configure are:

- Playwright (end-to-end tests)
- Lighthouse (performance/SEO/Accessibility audits)
- Storybook (component explorer + visual tests)

What has been added here:
- Setup guidance for each server so Copilot sessions can provision or generate workflow/config files.
- Example GitHub Actions snippets to run builds and tests locally in CI.

Playwright (recommended):
- Install: npm i -D @playwright/test playwright
- Typical workflow steps: npm ci && npm run build && npm run start (background) && npx playwright test
- Run a single spec: npx playwright test tests/example.spec.ts
- Notes: Playwright needs browsers installed; `npx playwright install` is required when adding it.

Lighthouse (headless audits):
- Install: npm i -D @lhci/cli or use `lighthouse-ci` Docker images
- Typical workflow steps: npm ci && npm run build && npm run start && npx lhci autorun --collect.url=http://localhost:3000
- Use for periodic performance/SEO checks; can be run against specific pages.

Storybook (component dev + visual tests):
- Install: follow Storybook for React+Vite/Next; typical commands: npx sb init
- Typical workflow steps: npm ci && npm run build && npx storybook build
- Use Chromatic or Playwright snapshot tests to add visual regression checks.

Example GitHub Actions snippets (copy into .github/workflows/*.yml when ready):
- Playwright: run install, build, start server (background), run playwright tests.
- Lighthouse: build, start server, run LHCI autorun.
- Storybook: build and (optionally) deploy Storybook artifact.

If you want, Copilot can now:
- Add full GitHub Actions workflow files for Playwright/Lighthouse/Storybook
- Add package.json devDependencies and scripts (playwright install, test scripts)
- Scaffold minimal Playwright test examples and CI-friendly server start commands

Next step: create workflows and add devDependencies (yes/no)?
