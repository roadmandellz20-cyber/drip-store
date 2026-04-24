import "server-only";

import {
  sanitizeIdInput,
  sanitizeMultilineInput,
  sanitizeSingleLineInput,
  sanitizeSlugInput,
} from "@/lib/input";
import {
  ALL_PRODUCTS,
  getCanonicalProductImageUrl,
  getLocalProductImageUrl,
  getProductBySku,
  type Product,
} from "@/lib/products";

type ProductRow = Record<string, unknown>;

function asString(value: unknown, maxLength = 255) {
  return sanitizeSingleLineInput(value, {
    collapseWhitespace: true,
    maxLength,
  });
}

function asMultiline(value: unknown, maxLength = 5000) {
  return sanitizeMultilineInput(value, {
    collapseWhitespace: true,
    maxLength,
  });
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}

function normalizeInteger(value: unknown, fallback = 0) {
  const parsed = asNumber(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

function normalizeDetails(value: unknown, fallback: string[] = []) {
  let parsed: unknown = value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("[")) {
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        parsed = value;
      }
    }
  }

  if (!Array.isArray(parsed)) {
    return fallback;
  }

  const details = parsed
    .map((entry) => sanitizeSingleLineInput(entry, { maxLength: 160 }))
    .filter(Boolean);

  return details.length > 0 ? details : fallback;
}

function deriveCategory(isNew: boolean, isLimited: boolean): Product["category"] {
  if (isLimited) return "limited";
  if (isNew) return "new";
  return "all";
}

function sortProducts(products: Product[]) {
  return [...products].sort((left, right) => {
    const leftOrder = (left as Product & { sortOrder?: number }).sortOrder ?? 0;
    const rightOrder = (right as Product & { sortOrder?: number }).sortOrder ?? 0;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    const leftLimitedScore = left.isLimited ? 0 : 1;
    const rightLimitedScore = right.isLimited ? 0 : 1;
    if (leftLimitedScore !== rightLimitedScore) {
      return leftLimitedScore - rightLimitedScore;
    }

    const leftNewScore = left.isNew ? 0 : 1;
    const rightNewScore = right.isNew ? 0 : 1;
    if (leftNewScore !== rightNewScore) {
      return leftNewScore - rightNewScore;
    }

    return left.name.localeCompare(right.name);
  });
}

function normalizeProductRow(row: ProductRow): Product | null {
  const slug = sanitizeSlugInput(row.slug || row.sku, 64);
  if (!slug) return null;

  const legacy = getProductBySku(slug);
  const statusRaw = asString(row.status, 32).toUpperCase();
  const isArchived = statusRaw === "ARCHIVED";
  const isLimitedRaw = row.is_limited;
  const isLimited =
    typeof isLimitedRaw === "boolean"
      ? isLimitedRaw
      : isArchived
        ? false
        : statusRaw === "LIMITED"
          ? true
          : legacy?.isLimited || false;
  const stockQty =
    row.stock_qty === null
      ? null
      : Number.isFinite(asNumber(row.stock_qty))
        ? Math.max(0, Math.floor(asNumber(row.stock_qty)))
        : legacy?.stockQty ?? null;
  const soldQty = normalizeInteger(row.sold_qty, legacy?.soldQty ?? 0);
  const available =
    isLimited && stockQty !== null ? Math.max(0, stockQty - soldQty) : null;
  const priceCents = asNumber(row.price_cents);
  const price =
    Number.isFinite(priceCents) && priceCents > 0 ? Math.round(priceCents) / 100 : legacy?.price ?? 0;
  const isNew = typeof row.is_new === "boolean" ? row.is_new : legacy?.isNew ?? false;
  const imageUrlFromDb = sanitizeSingleLineInput(row.image_url || row.image_main || row.image_alt, {
    collapseWhitespace: false,
    maxLength: 2048,
  });
  const localFallback = getLocalProductImageUrl(slug);
  const fallbackImage =
    sanitizeSingleLineInput(row.image_main || row.image_alt, {
      collapseWhitespace: false,
      maxLength: 2048,
    }) ||
    legacy?.imageFallbackUrl ||
    (imageUrlFromDb ? imageUrlFromDb : localFallback);

  return {
    id: sanitizeIdInput(row.id, 120) || legacy?.id || slug,
    sku: slug,
    name: asString(row.title || row.name, 160) || legacy?.name || slug,
    price,
    imageUrl: imageUrlFromDb || legacy?.imageUrl || getCanonicalProductImageUrl(slug),
    imageFallbackUrl: fallbackImage,
    lookImageUrl: legacy?.lookImageUrl || (null as unknown as string),
    lookImageFallbackUrl: legacy?.lookImageFallbackUrl || (null as unknown as string),
    limited: isLimited,
    isLimited,
    stockQty: isLimited ? stockQty : null,
    soldQty,
    available,
    availableQty: available,
    soldOut: isLimited && available !== null && available <= 0,
    isNew,
    category: deriveCategory(isNew, isLimited),
    description: asMultiline(row.description, 5000) || legacy?.description || "",
    details: normalizeDetails(row.details, legacy?.details || []),
    brandLine:
      asString(row.brand_line || row.tagline, 120) || legacy?.brandLine || "ENTER THE MUGEN.",
  };
}

function isVisibleProductRow(row: ProductRow) {
  const status = asString(row.status, 32).toUpperCase();
  const isActive =
    typeof row.is_active === "boolean" ? row.is_active : status !== "ARCHIVED";

  return isActive && status !== "ARCHIVED";
}

function sortProductRows(rows: ProductRow[]) {
  return [...rows].sort((left, right) => {
    const leftOrder = Number.isFinite(asNumber(left.sort_order)) ? Math.floor(asNumber(left.sort_order)) : 0;
    const rightOrder = Number.isFinite(asNumber(right.sort_order)) ? Math.floor(asNumber(right.sort_order)) : 0;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    const leftCreatedAt = Date.parse(asString(left.created_at, 64));
    const rightCreatedAt = Date.parse(asString(right.created_at, 64));
    if (Number.isFinite(leftCreatedAt) && Number.isFinite(rightCreatedAt) && leftCreatedAt !== rightCreatedAt) {
      return leftCreatedAt - rightCreatedAt;
    }

    return asString(left.slug || left.sku, 64).localeCompare(asString(right.slug || right.sku, 64));
  });
}

async function loadSupabaseAdmin() {
  try {
    const mod = await import("@/lib/supabase-admin");
    return mod.supabaseAdmin;
  } catch {
    return null;
  }
}

async function fetchProductRows(slugs?: string[]) {
  const normalizedSlugs = Array.from(
    new Set((slugs || []).map((slug) => sanitizeSlugInput(slug, 64)).filter(Boolean))
  );

  const supabaseAdmin = await loadSupabaseAdmin();
  if (!supabaseAdmin) {
    return null;
  }

  try {
    let query = supabaseAdmin.from("products").select("*");
    if (normalizedSlugs.length > 0) {
      query = query.in("slug", normalizedSlugs);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[products-server] failed to fetch product rows", error.message);
      return null;
    }

    return sortProductRows((data as ProductRow[] | null) || []);
  } catch (error) {
    console.error("[products-server] failed to fetch product rows", error);
    return null;
  }
}

function fallbackProducts(slugs?: string[]) {
  const normalizedSlugs = (slugs || []).map((slug) => sanitizeSlugInput(slug, 64)).filter(Boolean);
  const products =
    normalizedSlugs.length > 0
      ? ALL_PRODUCTS.filter((product) => normalizedSlugs.includes(product.sku))
      : ALL_PRODUCTS;

  return sortProducts(products);
}

export async function fetchProductsWithInventory(slugs?: string[]) {
  const rows = await fetchProductRows(slugs);

  if (!rows) {
    return fallbackProducts(slugs);
  }

  const normalizedSlugs = (slugs || []).map((slug) => sanitizeSlugInput(slug, 64)).filter(Boolean);
  const visibleRows = rows.filter(isVisibleProductRow);
  const filteredRows =
    normalizedSlugs.length > 0
      ? visibleRows.filter((row) => normalizedSlugs.includes(sanitizeSlugInput(row.slug || row.sku, 64)))
      : visibleRows;
  const products = filteredRows
    .map((row) => normalizeProductRow(row))
    .filter((product): product is Product => product !== null);

  return sortProducts(products);
}

export async function fetchProductBySlug(slug: string) {
  const normalizedSlug = sanitizeSlugInput(slug, 64);
  if (!normalizedSlug) return null;

  const products = await fetchProductsWithInventory([normalizedSlug]);
  return products.find((product) => product.sku === normalizedSlug) || null;
}

export async function fetchRelatedProducts(
  currentProduct: Pick<Product, "id" | "sku" | "isLimited" | "isNew">,
  count = 3
) {
  const products = await fetchProductsWithInventory();
  const candidates = products.filter(
    (product) => product.sku !== currentProduct.sku && product.id !== currentProduct.id
  );

  const preferred = candidates.filter(
    (product) =>
      product.isLimited === currentProduct.isLimited || product.isNew === currentProduct.isNew
  );
  const preferredSkus = new Set(preferred.map((product) => product.sku));
  const fallback = candidates.filter((product) => !preferredSkus.has(product.sku));

  return [...preferred, ...fallback].slice(0, count);
}
