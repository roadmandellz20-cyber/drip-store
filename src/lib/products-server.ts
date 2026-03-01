import "server-only";

import { ALL_PRODUCTS, mergeProductInventory, type ProductInventorySnapshot } from "@/lib/products";
import { supabaseAdmin } from "@/lib/supabase-admin";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}

function normalizeInventoryRow(row: Record<string, unknown>): ProductInventorySnapshot | null {
  const slug = asString(row.slug) || asString(row.sku);
  if (!slug) return null;

  const status = asString(row.status).toUpperCase();

  // IMPORTANT:
  // Only set isLimited when the DB explicitly provides it.
  // If we default it to false, we will accidentally override baseProducts.isLimited = true.
  const isLimitedRaw = row.is_limited;
  const isLimited =
    typeof isLimitedRaw === "boolean"
      ? isLimitedRaw
      : status === "LIMITED"
        ? true
        : undefined;

  const stockQtyRaw = asNumber(row.stock_qty);
  const stockQty = Number.isFinite(stockQtyRaw) ? Math.max(0, Math.floor(stockQtyRaw)) : null;

  const soldQtyRaw = asNumber(row.sold_qty);
  const soldQty = Number.isFinite(soldQtyRaw) ? Math.max(0, Math.floor(soldQtyRaw)) : 0;

  const snapshot: ProductInventorySnapshot = {
    id: asString(row.id) || undefined,
    slug,
    isLimited,
    stockQty,
    soldQty,
  };

  if (isLimited === true && stockQty !== null) {
    const available = Math.max(0, stockQty - soldQty);
    snapshot.available = available;
    snapshot.availableQty = available;
  }

  return snapshot;
}

export async function fetchProductInventorySnapshots(slugs?: string[]) {
  const normalizedSlugs = Array.from(
    new Set((slugs || []).map((slug) => slug.trim().toLowerCase()).filter(Boolean))
  );

  let primaryQuery = supabaseAdmin
    .from("products")
    .select("id,slug,sku,status,is_limited,stock_qty,sold_qty");

  if (normalizedSlugs.length > 0) {
    primaryQuery = primaryQuery.in("slug", normalizedSlugs);
  }

  const primary = await primaryQuery;

  const rows = primary.error
    ? (
        await (normalizedSlugs.length > 0
          ? supabaseAdmin.from("products").select("*").in("slug", normalizedSlugs)
          : supabaseAdmin.from("products").select("*"))
      ).data || []
    : primary.data || [];

  return (rows as Record<string, unknown>[])
    .map((row) => normalizeInventoryRow(row))
    .filter((row): row is ProductInventorySnapshot => row !== null);
}

export async function fetchProductsWithInventory(slugs?: string[]) {
  const normalizedSlugs = (slugs || []).map((slug) => slug.trim().toLowerCase()).filter(Boolean);
  const baseProducts =
    normalizedSlugs.length > 0
      ? ALL_PRODUCTS.filter((product) => normalizedSlugs.includes(product.sku.toLowerCase()))
      : ALL_PRODUCTS;

  const snapshots = await fetchProductInventorySnapshots(baseProducts.map((product) => product.sku));
  return mergeProductInventory(baseProducts, snapshots);
}
