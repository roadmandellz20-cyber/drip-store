import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  isSameOriginRequest,
  verifyAdminSession,
} from "@/lib/admin-auth";
import { sanitizeSlugInput, sanitizeSingleLineInput } from "@/lib/input";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const ALLOWED_STATUSES = ["AVAILABLE", "LIMITED", "ARCHIVED"] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

function isAllowedStatus(value: string): value is AllowedStatus {
  return (ALLOWED_STATUSES as readonly string[]).includes(value);
}

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

  const updates: Record<string, unknown> = {};

  if ("stock_qty" in body) {
    const val = body.stock_qty;
    if (val === null) {
      updates.stock_qty = null;
    } else if (typeof val === "number" && Number.isFinite(val) && val >= 0) {
      updates.stock_qty = Math.floor(val);
    } else {
      return NextResponse.json({ error: "Invalid stock_qty." }, { status: 400 });
    }
  }

  if ("is_limited" in body) {
    if (typeof body.is_limited !== "boolean") {
      return NextResponse.json({ error: "is_limited must be a boolean." }, { status: 400 });
    }
    updates.is_limited = body.is_limited;
    if (!("status" in body)) {
      updates.status = body.is_limited ? "LIMITED" : "AVAILABLE";
    }
  }

  if ("status" in body) {
    const rawStatus = sanitizeSingleLineInput(body.status).toUpperCase();
    if (!isAllowedStatus(rawStatus)) {
      return NextResponse.json({ error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}.` }, { status: 400 });
    }
    updates.status = rawStatus;
    if (!("is_limited" in body)) {
      updates.is_limited = rawStatus === "LIMITED";
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const existing = await supabaseAdmin
    .from("products")
    .select("id,slug")
    .eq("slug", slug)
    .maybeSingle();

  if (existing.error || !existing.data) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const result = await supabaseAdmin
    .from("products")
    .update(updates)
    .eq("slug", slug)
    .select("id,slug,title,is_limited,stock_qty,sold_qty,status,price_cents")
    .maybeSingle();

  if (result.error) {
    console.error("[admin/products] update error", result.error.message);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, product: result.data });
}
