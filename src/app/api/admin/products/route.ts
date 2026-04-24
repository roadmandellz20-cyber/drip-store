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
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }

  const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!(await verifyAdminSession(sessionCookie))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = validateAdminProductPayload(body, "create");
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const payload = parsed.value;

  const existing = await supabaseAdmin
    .from("products")
    .select("id,slug")
    .eq("slug", payload.slug)
    .maybeSingle();

  if (existing.data) {
    return NextResponse.json({ error: "A product with that slug already exists." }, { status: 409 });
  }

  if (existing.error) {
    console.error("[admin/products] create lookup error", existing.error.message);
    return NextResponse.json({ error: "Unable to validate slug." }, { status: 500 });
  }

  const insertPayload = {
    slug: payload.slug,
    title: payload.title,
    description: payload.description,
    details: payload.details,
    brand_line: payload.brand_line,
    tagline: payload.brand_line,
    image_url: payload.image_url,
    image_main: payload.image_url,
    image_alt: payload.image_url,
    price_cents: payload.price_cents,
    currency: payload.currency,
    status: payload.status,
    is_active: payload.is_active,
    is_limited: payload.is_limited,
    stock_qty: payload.stock_qty,
    sold_qty: 0,
    is_new: payload.is_new,
    sort_order: payload.sort_order,
  };

  const result = await supabaseAdmin.from("products").insert(insertPayload).select("*").maybeSingle();

  if (result.error || !result.data) {
    console.error("[admin/products] create error", result.error?.message);
    return NextResponse.json({ error: "Create failed." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    product: normalizeAdminProductRow(result.data as Record<string, unknown>),
  });
}
