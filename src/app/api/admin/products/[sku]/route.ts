import { NextResponse, type NextRequest } from "next/server";
import {
  normalizeAdminProductRow,
  validateAdminProductPayload,
} from "@/lib/admin-products";
import {
  ADMIN_SESSION_COOKIE,
  isSameOriginRequest,
  verifyAdminSession,
} from "@/lib/admin-auth";
import { sanitizeSlugInput } from "@/lib/input";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ sku: string }> }
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }

  const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!(await verifyAdminSession(sessionCookie))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { sku } = await context.params;
  const slug = sanitizeSlugInput(sku, 64);
  if (!slug) {
    return NextResponse.json({ error: "Invalid SKU." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if ("slug" in body) {
    return NextResponse.json({ error: "slug cannot be updated." }, { status: 400 });
  }

  const parsed = validateAdminProductPayload(body, "update");
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const existing = await supabaseAdmin.from("products").select("id,slug").eq("slug", slug).maybeSingle();
  if (existing.error || !existing.data) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const payload = parsed.value;
  // Write to cover_image_url (the real primary column) plus all alias columns
  // so every image field stays in sync regardless of migration history.
  const updates = {
    title: payload.title,
    description: payload.description,
    details: payload.details,
    brand_line: payload.brand_line,
    tagline: payload.brand_line,
    cover_image_url: payload.image_url,
    image_url: payload.image_url,
    image_main: payload.image_url,
    image_alt: payload.image_url,
    price_cents: payload.price_cents,
    currency: payload.currency,
    status: payload.status,
    is_active: payload.is_active,
    is_limited: payload.is_limited,
    stock_qty: payload.stock_qty,
    is_new: payload.is_new,
    sort_order: payload.sort_order,
  };

  const result = await supabaseAdmin
    .from("products")
    .update(updates)
    .eq("slug", slug)
    .select("*")
    .maybeSingle();

  if (result.error) {
    console.error("[admin/products] Supabase update error:", result.error);
    return NextResponse.json(
      { error: result.error.message || "Database update failed." },
      { status: 500 }
    );
  }

  if (!result.data) {
    console.error("[admin/products] update returned no row for slug:", slug);
    return NextResponse.json({ error: "Product not found after update." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    product: normalizeAdminProductRow(result.data as Record<string, unknown>),
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ sku: string }> }
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }

  const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!(await verifyAdminSession(sessionCookie))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { sku } = await context.params;
  const slug = sanitizeSlugInput(sku, 64);
  if (!slug) {
    return NextResponse.json({ error: "Invalid SKU." }, { status: 400 });
  }

  // Check for existing orders referencing this product — warn but still allow delete
  const orderCheck = await supabaseAdmin
    .from("order_items")
    .select("id")
    .eq("product_sku", slug)
    .limit(1);

  if (orderCheck.error) {
    console.warn("[admin/products] Could not check order references for slug:", slug, orderCheck.error);
  } else if (orderCheck.data && orderCheck.data.length > 0) {
    console.warn("[admin/products] Deleting product with existing order references:", slug);
  }

  const result = await supabaseAdmin.from("products").delete().eq("slug", slug);

  if (result.error) {
    console.error("[admin/products] Supabase delete error:", result.error);
    return NextResponse.json(
      { error: result.error.message || "Database delete failed." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
