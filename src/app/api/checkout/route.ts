import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type CheckoutItem = {
  productId: string;
  title: string;
  priceCents: number;
  currency?: string;
  size?: string;
  qty: number;
};

type CheckoutPayload = {
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  note?: string;
  items?: CheckoutItem[];
};

export async function POST(req: Request) {
  const body = (await req.json()) as CheckoutPayload;

  const customer_name = body.customer_name?.trim() || "";
  const customer_phone = body.customer_phone?.trim() || "";
  const customer_address = body.customer_address?.trim() || "";
  const note = body.note?.trim() || "";
  const items = Array.isArray(body.items) ? body.items : [];

  if (!customer_name || !customer_phone || !customer_address || items.length === 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const total_cents = items.reduce((sum, x) => sum + x.priceCents * x.qty, 0);
  const currency = items[0]?.currency || "GMD";

  const { data: order, error: orderErr } = await supabaseServer
    .from("orders")
    .insert([{ customer_name, customer_phone, customer_address, note, total_cents, currency }])
    .select("id")
    .single();

  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });

  const orderItemsPayload = items.map((x) => ({
    order_id: order.id,
    product_id: x.productId,
    title: x.title,
    price_cents: x.priceCents,
    size: x.size,
    qty: x.qty,
  }));

  const { error: itemsErr } = await supabaseServer.from("order_items").insert(orderItemsPayload);
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, orderId: order.id });
}
