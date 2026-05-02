/**
 * End-to-end checkout test — orders 3 test products.
 * Run: npm run test:checkout
 * Requires: .env.local with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TEST_MODE_SECRET
 * Optional: TEST_BASE_URL (defaults to http://localhost:3000)
 */
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const TEST_MODE_SECRET = process.env.TEST_MODE_SECRET ?? "";

const TEST_PRODUCTS = [
  { sku: "test-product-01", name: "Test Product 1", price: 100 },
  { sku: "test-product-02", name: "Test Product 2", price: 2000 },
  { sku: "test-product-03", name: "Test Product 3", price: 1500 },
];

const TEST_SKUS = TEST_PRODUCTS.map((p) => p.sku);

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

async function cleanupTestData() {
  let cleanupOk = true;

  const { data: testProducts, error: testProductsErr } = await supabase
    .from("products")
    .select("id, slug")
    .in("slug", TEST_SKUS);

  if (testProductsErr) {
    cleanupOk = false;
    console.error(`  → test product lookup failed: ${testProductsErr.message}`);
  }

  const testProductIds = ((testProducts ?? []) as { id?: string | null }[])
    .map((product) => product.id)
    .filter((id): id is string => Boolean(id));

  const { data: staleItemsBySlug, error: staleItemsBySlugErr } = await supabase
    .from("order_items")
    .select("order_id")
    .in("product_slug", TEST_SKUS);

  if (staleItemsBySlugErr) {
    cleanupOk = false;
    console.error(`  → test order lookup by slug failed: ${staleItemsBySlugErr.message}`);
  }

  const staleItemsByProductId = testProductIds.length > 0
    ? await supabase
      .from("order_items")
      .select("order_id")
      .in("product_id", testProductIds)
    : { data: [], error: null };

  if (staleItemsByProductId.error) {
    cleanupOk = false;
    console.error(`  → test order lookup by product id failed: ${staleItemsByProductId.error.message}`);
  }

  const staleItems = [
    ...((staleItemsBySlug ?? []) as { order_id?: string | null }[]),
    ...((staleItemsByProductId.data ?? []) as { order_id?: string | null }[]),
  ];

  const orderIds = Array.from(
    new Set(
      staleItems
        .map((item) => item.order_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  if (orderIds.length > 0) {
    const { error: itemsDelErr } = await supabase
      .from("order_items")
      .delete()
      .in("order_id", orderIds);
    if (itemsDelErr) {
      cleanupOk = false;
      console.error(`  → test order_items delete failed: ${itemsDelErr.message}`);
    }

    const { error: ordersDelErr } = await supabase
      .from("orders")
      .delete()
      .in("id", orderIds);
    if (ordersDelErr) {
      cleanupOk = false;
      console.error(`  → test orders delete failed: ${ordersDelErr.message}`);
    }
  }

  for (const sku of TEST_SKUS) {
    const { error: resetErr } = await supabase
      .from("products")
      .update({ sold_qty: 0 })
      .eq("slug", sku);
    if (resetErr) {
      cleanupOk = false;
      console.error(`  → sold_qty reset failed for ${sku}: ${resetErr.message}`);
    }

    const { error: delErr } = await supabase
      .from("products")
      .delete()
      .eq("slug", sku);
    if (delErr) {
      cleanupOk = false;
      console.error(`  → product delete failed for ${sku}: ${delErr.message}`);
    }
  }

  return cleanupOk;
}

async function run() {
  console.log(`\nCheckout test → ${BASE_URL}\n`);

  console.log("  → Removing stale test orders/products");
  await cleanupTestData();

  // ── Step 1: Upsert all 3 test products ──────────────────────────────────────
  for (const p of TEST_PRODUCTS) {
    const { error } = await supabase.from("products").upsert(
      {
        slug: p.sku,
        title: p.name,
        description: "Checkout test product — auto-cleanup",
        brand_line: "TEST",
        image_url: "",
        price_cents: p.price,
        currency: "GMD",
        status: "AVAILABLE",
        is_active: true,
        is_limited: true,
        stock_qty: 999,
        sold_qty: 0,
        is_new: false,
        sort_order: 999,
        details: [],
      },
      { onConflict: "slug" }
    );

    if (error) {
      console.error(`FAIL: Could not upsert ${p.sku}:`, error.message);
      process.exit(1);
    }
  }

  // Fetch initial sold_qty for all 3 test products
  const { data: productsBefore, error: fetchErr } = await supabase
    .from("products")
    .select("id, slug, sold_qty")
    .in("slug", TEST_SKUS);

  if (fetchErr || !productsBefore || productsBefore.length < 3) {
    console.error("FAIL: Test products not found after upsert");
    process.exit(1);
  }

  const initialSoldQty = Object.fromEntries(
    (productsBefore as { slug: string; sold_qty: number }[]).map((p) => [p.slug, p.sold_qty])
  );
  const productIdsBySku = Object.fromEntries(
    (productsBefore as { id: string; slug: string }[]).map((p) => [p.slug, p.id])
  );
  console.log(`  → 3 test products ready`);

  // ── Step 2: POST order with all 3 items ────────────────────────────────────
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
        items: [
          { sku: "test-product-01", quantity: 1, size: "M" },
          { sku: "test-product-02", quantity: 1, size: "L" },
          { sku: "test-product-03", quantity: 1, size: "S" },
        ],
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

  // ── Step 3: Verify order_items has 3 rows ──────────────────────────────────
  if (orderId) {
    const { data: items, error: itemsErr } = await supabase
      .from("order_items")
      .select("product_id, product_slug, qty, unit_price_cents")
      .eq("order_id", orderId);

    if (itemsErr) {
      console.error(`  → order_items query failed: ${itemsErr.message}`);
    } else if (
      items &&
      items.length === 3 &&
      TEST_SKUS.every((sku) => {
        const productId = productIdsBySku[sku];
        return items.some((item) => {
          const row = item as { product_id?: string | null; product_slug?: string | null };
          return row.product_slug === sku || row.product_id === productId;
        });
      })
    ) {
      results["Order items"] = "PASS";
      console.log(`  → order_items: 3 rows — ${TEST_SKUS.join(", ")}`);
    } else {
      console.error(`  → expected 3 order_items, got ${items?.length ?? 0}: ${JSON.stringify(items)}`);
    }
  }

  // ── Step 4: Verify inventory incremented for all 3 ─────────────────────────
  if (orderId) {
    const { data: productsAfter } = await supabase
      .from("products")
      .select("slug, sold_qty")
      .in("slug", TEST_SKUS);

    const after = Object.fromEntries(
      ((productsAfter ?? []) as { slug: string; sold_qty: number }[]).map((p) => [p.slug, p.sold_qty])
    );

    const allIncremented = TEST_PRODUCTS.every(
      (p) => (after[p.sku] ?? 0) > (initialSoldQty[p.sku] ?? 0)
    );

    if (allIncremented) {
      results["Inventory update"] = "PASS";
      const detail = TEST_PRODUCTS.map(
        (p) => `${p.sku}: ${initialSoldQty[p.sku] ?? 0}→${after[p.sku] ?? 0}`
      ).join(", ");
      console.log(`  → sold_qty incremented: ${detail}`);
    } else {
      console.error(`  → sold_qty not incremented for all products`);
    }
  }

  // ── Step 5: Email check ────────────────────────────────────────────────────
  if (orderId) {
    if (emailStatus !== null && emailStatus !== undefined) {
      results["Email triggered"] = "PASS";
      const detail = emailAdminSent ? "admin sent" : `status=${emailStatus}`;
      console.log(`  → Email pipeline ran (${detail})`);
    } else {
      console.error("  → email_status missing from response — pipeline may not have run");
    }
  }

  // ── Step 6: Cleanup ────────────────────────────────────────────────────────
  const cleanupOk = await cleanupTestData();

  if (cleanupOk) {
    results["Cleanup"] = "PASS";
    console.log("  → Cleanup complete — no test data remains");
  }

  // ── Report ─────────────────────────────────────────────────────────────────
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
