import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const body = await req.json();

  const { customer_name, customer_phone, customer_address, note, items } = body;

  if (!customer_name || !customer_phone || !customer_address || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const total_cents = items.reduce((sum: number, x: any) => sum + x.priceCents * x.qty, 0);
  const currency = items[0]?.currency || "GMD";

  const { data: order, error: orderErr } = await supabaseServer
    .from("orders")
    .insert([{ customer_name, customer_phone, customer_address, note: note || "", total_cents, currency }])
    .select("*")
    .single();

  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });

  const orderItemsPayload = items.map((x: any) => ({
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
