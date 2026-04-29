/**
 * End-to-end checkout test.
 * Run: npm run test:checkout
 * Requires: .env.local with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TEST_MODE_SECRET
 * Optional: TEST_BASE_URL (defaults to http://localhost:3000)
 */
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const TEST_SKU = "test-product-01";
const TEST_MODE_SECRET = process.env.TEST_MODE_SECRET ?? "";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("FAIL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
if (TEST_MODE_SECRET.length < 16) {
  console.error("FAIL: TEST_MODE_SECRET must be set (>= 16 chars) in .env.local");
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const results: Record<string, "PASS" | "FAIL"> = {
  "Order creation":   "FAIL",
  "Order items":      "FAIL",
  "Inventory update": "FAIL",
  "Email triggered":  "FAIL",
  "Cleanup":          "FAIL",
};

async function run() {
  console.log(`\nCheckout test → ${BASE_URL}\n`);

  // ── Step 1: Upsert test product ──────────────────────────────────────────────
  const { error: upsertErr } = await supabase.from("products").upsert(
    {
      slug: TEST_SKU,
      title: "Test Product",
      description: "Checkout test product — auto-cleanup",
      brand_line: "TEST",
      image_url: "",
      price_cents: 100,
      currency: "GMD",
      status: "AVAILABLE",
      is_active: true,
      is_limited: true,  // must be limited so sold_qty increments via RPC
      stock_qty: 999,
      sold_qty: 0,
      is_new: false,
      sort_order: 999,
      details: [],
    },
    { onConflict: "slug" }
  );

  if (upsertErr) {
    console.error("FAIL: Could not upsert test product:", upsertErr.message);
    process.exit(1);
  }

  const { data: productBefore, error: fetchErr } = await supabase
    .from("products")
    .select("id, slug, sold_qty")
    .eq("slug", TEST_SKU)
    .single();

  if (fetchErr || !productBefore) {
    console.error("FAIL: Test product not found after upsert");
    process.exit(1);
  }

  const initialSoldQty = productBefore.sold_qty as number;
  console.log(`  → Test product ready (sold_qty=${initialSoldQty})`);

  // ── Step 2: POST to order creation endpoint ──────────────────────────────────
  let orderId: string | null = null;
  let orderRef: string | null = null;
  let emailStatus: string | null = null;
  let emailAdminSent: boolean | null = null;

  try {
    const res = await fetch(`${BASE_URL}/api/orders/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-mode-secret": TEST_MODE_SECRET,
      },
      body: JSON.stringify({
        shipping: {
          name: "Test Order",
          email: process.env.ADMIN_ORDER_EMAIL ?? "test@mugendistrict.com",
          phone: "1234567890",
          address1: "123 Test Street",
          city: "Test City",
          country: "The Gambia",
        },
        cart: [{ sku: TEST_SKU, qty: 1 }],
      }),
    });

    const data = await res.json() as {
      ok?: boolean;
      order_id?: string;
      order_ref?: string;
      email_status?: string;
      email_admin_sent?: boolean | null;
      error?: string;
    };

    if (res.ok && data.ok && data.order_id) {
      results["Order creation"] = "PASS";
      orderId = data.order_id;
      orderRef = data.order_ref ?? null;
      emailStatus = data.email_status ?? null;
      emailAdminSent = data.email_admin_sent ?? null;
      console.log(`  → Order created: ${orderRef} (${orderId})`);
    } else {
      console.error(`  → POST failed ${res.status}: ${data.error ?? JSON.stringify(data)}`);
    }
  } catch (err) {
    console.error(`  → Request threw: ${err}`);
  }

  // ── Step 3: Verify order_items ───────────────────────────────────────────────
  if (orderId) {
    const { data: items, error: itemsErr } = await supabase
      .from("order_items")
      .select("product_slug, qty, unit_price_cents")
      .eq("order_id", orderId);

    if (itemsErr) {
      console.error(`  → order_items query failed: ${itemsErr.message}`);
    } else if (items && items.length > 0 && (items[0] as { qty: number }).qty >= 1) {
      results["Order items"] = "PASS";
      const sku = (items[0] as { product_slug?: string }).product_slug ?? "(slug not stored)";
      console.log(`  → order_items: ${items.length} row(s), qty=${(items[0] as { qty: number }).qty}, sku=${sku}`);
    } else {
      console.error(`  → order_items empty or qty=0: ${JSON.stringify(items)}`);
    }
  }

  // ── Step 4: Verify inventory update ─────────────────────────────────────────
  if (orderId) {
    const { data: productAfter } = await supabase
      .from("products")
      .select("sold_qty")
      .eq("slug", TEST_SKU)
      .single();

    const soldAfter = (productAfter as { sold_qty: number } | null)?.sold_qty ?? initialSoldQty;
    if (soldAfter > initialSoldQty) {
      results["Inventory update"] = "PASS";
      console.log(`  → sold_qty: ${initialSoldQty} → ${soldAfter}`);
    } else {
      console.error(`  → sold_qty unchanged (${soldAfter}) — RPC may not have incremented`);
    }
  }

  // ── Step 5: Email check (from response metadata) ─────────────────────────────
  if (orderId) {
    // Email pipeline ran if email_status is present in the response
    if (emailStatus !== null && emailStatus !== undefined) {
      results["Email triggered"] = "PASS";
      const detail = emailAdminSent ? "admin sent" : `status=${emailStatus}`;
      console.log(`  → Email pipeline ran (${detail})`);
    } else {
      console.error("  → email_status missing from response — pipeline may not have run");
    }
  }

  // ── Step 6: Cleanup ──────────────────────────────────────────────────────────
  let cleanupOk = true;

  if (orderId) {
    const { error: itemsDelErr } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", orderId);
    if (itemsDelErr) {
      cleanupOk = false;
      console.error(`  → order_items delete failed: ${itemsDelErr.message}`);
    }

    const { error: orderDelErr } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId);
    if (orderDelErr) {
      cleanupOk = false;
      console.error(`  → order delete failed: ${orderDelErr.message}`);
    }
  }

  const { error: resetErr } = await supabase
    .from("products")
    .update({ sold_qty: 0 })
    .eq("slug", TEST_SKU);
  if (resetErr) {
    cleanupOk = false;
    console.error(`  → sold_qty reset failed: ${resetErr.message}`);
  }

  const { error: prodDelErr } = await supabase
    .from("products")
    .delete()
    .eq("slug", TEST_SKU);
  if (prodDelErr) {
    cleanupOk = false;
    console.error(`  → product delete failed: ${prodDelErr.message}`);
  }

  if (cleanupOk) {
    results["Cleanup"] = "PASS";
    console.log("  → Cleanup complete — no test data remains");
  }

  // ── Report ───────────────────────────────────────────────────────────────────
  const pad = 20;
  console.log("\nCHECKOUT TEST REPORT");
  console.log("====================");
  for (const [label, result] of Object.entries(results)) {
    console.log(`${label.padEnd(pad)}: ${result}`);
  }

  const allPass = Object.values(results).every((r) => r === "PASS");
  console.log(`\nOVERALL: ${allPass ? "PASS" : "FAIL"}\n`);

  if (!allPass) process.exit(1);
}

run().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
