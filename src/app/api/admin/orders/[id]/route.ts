import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function asString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function redirectToOrders(request: NextRequest, state: string) {
  const url = new URL("/admin/orders", request.url);
  url.searchParams.set("state", state);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

  if (!(await verifyAdminSession(sessionCookie))) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirect", "/admin/orders");
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  const { id } = await context.params;
  const orderId = id.trim();

  if (!orderId) {
    return redirectToOrders(request, "invalid");
  }

  const formData = await request.formData();
  const action = asString(formData.get("action")).toLowerCase();

  if (!["confirm", "cancel", "delete"].includes(action)) {
    return redirectToOrders(request, "invalid");
  }

  const orderQuery = await supabaseAdmin
    .from("orders")
    .select("id,status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderQuery.error || !orderQuery.data) {
    return redirectToOrders(request, "missing");
  }

  const currentStatus = normalizeStatus(orderQuery.data.status);

  if (action === "delete") {
    const deleteQuery = await supabaseAdmin.from("orders").delete().eq("id", orderId);
    return deleteQuery.error ? redirectToOrders(request, "error") : redirectToOrders(request, "deleted");
  }

  if (currentStatus === "completed") {
    return redirectToOrders(request, "locked");
  }

  const nextStatus = action === "confirm" ? "confirmed" : "cancelled";
  const updateQuery = await supabaseAdmin.from("orders").update({ status: nextStatus }).eq("id", orderId);

  if (updateQuery.error) {
    return redirectToOrders(request, "error");
  }

  return redirectToOrders(request, action === "confirm" ? "confirmed" : "cancelled");
}
