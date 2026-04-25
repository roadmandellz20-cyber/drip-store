import {
  sanitizeIdInput,
  sanitizeMultilineInput,
  sanitizeSingleLineInput,
  sanitizeSlugInput,
} from "@/lib/input";

export const ADMIN_PRODUCT_STATUSES = ["AVAILABLE", "LIMITED", "ARCHIVED"] as const;

export type AdminProductStatus = (typeof ADMIN_PRODUCT_STATUSES)[number];

export type AdminProduct = {
  id: string;
  slug: string;
  title: string;
  description: string;
  details: string[];
  brand_line: string;
  image_url: string;
  price_cents: number;
  currency: string;
  status: AdminProductStatus;
  is_active: boolean;
  is_limited: boolean;
  stock_qty: number | null;
  sold_qty: number;
  is_new: boolean;
  sort_order: number;
  soldOut: boolean;
};

export type AdminProductPayload = {
  slug?: string;
  title: string;
  description: string;
  details: string[];
  brand_line: string;
  image_url: string;
  price_cents: number;
  currency: string;
  status: AdminProductStatus;
  is_active: boolean;
  is_limited: boolean;
  stock_qty: number | null;
  is_new: boolean;
  sort_order: number;
};

function asString(value: unknown, maxLength = 255) {
  return sanitizeSingleLineInput(value, {
    collapseWhitespace: true,
    maxLength,
  });
}

function asMultiline(value: unknown, maxLength = 4000) {
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

export function isAdminProductStatus(value: string): value is AdminProductStatus {
  return (ADMIN_PRODUCT_STATUSES as readonly string[]).includes(value);
}

export function normalizeProductDetails(value: unknown, fallback: string[] = []) {
  let fromArray: unknown = value;

  if (!Array.isArray(value) && typeof value === "string" && value.trim().startsWith("[")) {
    try {
      fromArray = JSON.parse(value);
    } catch {
      fromArray = value;
    }
  }

  if (!Array.isArray(fromArray)) {
    return fallback;
  }

  const details = fromArray
    .map((entry) => sanitizeSingleLineInput(entry, { maxLength: 160 }))
    .filter(Boolean);

  return details.length > 0 ? details : fallback;
}

export function detailsToTextarea(details: string[]) {
  return details.join("\n");
}

export function normalizeAdminProductRow(row: Record<string, unknown>): AdminProduct {
  const slug = sanitizeSlugInput(row.slug || row.sku, 64);
  const statusRaw = asString(row.status, 32).toUpperCase();
  const status = isAdminProductStatus(statusRaw) ? statusRaw : "AVAILABLE";
  const isLimitedRaw = row.is_limited;
  const isLimited =
    typeof isLimitedRaw === "boolean" ? isLimitedRaw : status === "LIMITED";
  const stockQty =
    row.stock_qty === null ? null : Number.isFinite(asNumber(row.stock_qty))
      ? Math.max(0, Math.floor(asNumber(row.stock_qty)))
      : null;
  const soldQty = normalizeInteger(row.sold_qty, 0);
  const available = isLimited && stockQty !== null ? Math.max(0, stockQty - soldQty) : null;

  return {
    id: sanitizeIdInput(row.id, 120) || slug,
    slug,
    title: asString(row.title, 160),
    description: asMultiline(row.description, 5000),
    details: normalizeProductDetails(row.details, []),
    brand_line: asString(row.brand_line || row.tagline, 120) || "ENTER THE MUGEN.",
    image_url: sanitizeSingleLineInput(
      row.cover_image_url || row.image_url || row.image_main || row.image_alt,
      { collapseWhitespace: false, maxLength: 2048 }
    ),
    price_cents: normalizeInteger(row.price_cents, 0),
    currency: asString(row.currency, 8).toUpperCase() || "GMD",
    status,
    is_active: typeof row.is_active === "boolean" ? row.is_active : status !== "ARCHIVED",
    is_limited: isLimited,
    stock_qty: isLimited ? stockQty : null,
    sold_qty: soldQty,
    is_new: typeof row.is_new === "boolean" ? row.is_new : false,
    sort_order:
      Number.isFinite(asNumber(row.sort_order)) ? Math.floor(asNumber(row.sort_order)) : 0,
    soldOut: isLimited && available !== null && available <= 0,
  };
}

function normalizeDetailsInput(value: unknown) {
  if (!Array.isArray(value)) {
    return { ok: false as const, error: "details must be an array of strings." };
  }

  const details = value
    .map((entry) => sanitizeSingleLineInput(entry, { maxLength: 160 }))
    .filter(Boolean);

  return { ok: true as const, value: details };
}

export function validateAdminProductPayload(
  body: Record<string, unknown>,
  mode: "create" | "update"
): { ok: true; value: AdminProductPayload } | { ok: false; error: string } {
  const slug = sanitizeSlugInput(body.slug, 64);
  if (mode === "create" && !slug) {
    return { ok: false, error: "slug is required." };
  }

  const title = sanitizeSingleLineInput(body.title, { maxLength: 160 });
  if (!title) {
    return { ok: false, error: "title is required." };
  }

  const description = sanitizeMultilineInput(body.description, {
    maxLength: 5000,
  });
  const brandLine =
    sanitizeSingleLineInput(body.brand_line, { maxLength: 120 }) || "ENTER THE MUGEN.";
  const imageUrl = sanitizeSingleLineInput(body.image_url, {
    collapseWhitespace: false,
    maxLength: 2048,
  });
  if (!imageUrl) {
    return { ok: false, error: "image_url is required." };
  }

  const priceCents = asNumber(body.price_cents);
  if (!Number.isFinite(priceCents) || priceCents <= 0) {
    return { ok: false, error: "price_cents must be a positive number." };
  }

  const details = normalizeDetailsInput(body.details);
  if (!details.ok) {
    return details;
  }

  const statusRaw = sanitizeSingleLineInput(body.status, {
    uppercase: true,
    maxLength: 32,
  });
  if (!isAdminProductStatus(statusRaw)) {
    return {
      ok: false,
      error: `status must be one of: ${ADMIN_PRODUCT_STATUSES.join(", ")}.`,
    };
  }

  const isLimited =
    typeof body.is_limited === "boolean" ? body.is_limited : statusRaw === "LIMITED";
  let stockQty: number | null = null;
  if (body.stock_qty === null || body.stock_qty === "") {
    stockQty = null;
  } else if (body.stock_qty !== undefined) {
    const parsedStockQty = asNumber(body.stock_qty);
    if (!Number.isFinite(parsedStockQty) || parsedStockQty < 0) {
      return { ok: false, error: "stock_qty must be null or a non-negative number." };
    }
    stockQty = Math.floor(parsedStockQty);
  }

  if (isLimited && (stockQty === null || stockQty < 0)) {
    return { ok: false, error: "Limited products require a stock_qty of 0 or more." };
  }

  const isArchived = statusRaw === "ARCHIVED";
  const isActive = isArchived ? false : typeof body.is_active === "boolean" ? body.is_active : true;
  const currency =
    sanitizeSingleLineInput(body.currency, {
      uppercase: true,
      maxLength: 8,
    }) || "GMD";

  const sortOrderRaw = body.sort_order;
  const sortOrder =
    sortOrderRaw === "" || sortOrderRaw === undefined || sortOrderRaw === null
      ? 0
      : asNumber(sortOrderRaw);
  if (!Number.isFinite(sortOrder)) {
    return { ok: false, error: "sort_order must be a number." };
  }

  const payload: AdminProductPayload = {
    title,
    description,
    details: details.value,
    brand_line: brandLine,
    image_url: imageUrl,
    price_cents: Math.round(priceCents),
    currency,
    status: isLimited && !isArchived ? "LIMITED" : statusRaw,
    is_active: isActive,
    is_limited: isLimited,
    stock_qty: isLimited ? stockQty : null,
    is_new: Boolean(body.is_new),
    sort_order: Math.floor(sortOrder),
  };

  if (mode === "create") {
    payload.slug = slug;
  }

  return { ok: true, value: payload };
}
