"use client";

import { useEffect, useState } from "react";
import { CartItem, getCart, setCart, cartTotal } from "@/lib/cart";
import { formatMoney } from "@/lib/money";

export default function CheckoutPage() {
  const [items, setItemsState] = useState<CartItem[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string>("");

  useEffect(() => setItemsState(getCart()), []);

  const total = cartTotal(items);
  const currency = items[0]?.currency || "GMD";

  async function submit() {
    setStatus("");
    if (!name || !phone || !address) {
      setStatus("Fill name, phone, and address.");
      return;
    }
    if (items.length === 0) {
      setStatus("Cart is empty.");
      return;
    }

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: name,
        customer_phone: phone,
        customer_address: address,
        note,
        items,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setStatus(data?.error || "Checkout failed.");
      return;
    }

    setCart([]);
    setItemsState([]);
    setStatus(`Order placed. ID: ${data.orderId}`);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
      <p className="mt-2 text-sm text-neutral-600">
        $0 budget mode: we save your order and contact you to confirm.
      </p>

      <div className="mt-8 grid gap-4">
        <input className="rounded-2xl border px-4 py-3 text-sm" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="rounded-2xl border px-4 py-3 text-sm" placeholder="Phone (WhatsApp)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className="rounded-2xl border px-4 py-3 text-sm" placeholder="Delivery address" value={address} onChange={(e) => setAddress(e.target.value)} />
        <textarea className="min-h-24 rounded-2xl border px-4 py-3 text-sm" placeholder="Note (size swap, color, landmark…)" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className="mt-8 flex items-center justify-between rounded-3xl border p-6">
        <div>
          <div className="text-sm text-neutral-600">Total</div>
          <div className="text-xl font-semibold">{formatMoney(total, currency)}</div>
        </div>
        <button onClick={submit} className="rounded-2xl bg-black px-5 py-3 text-sm text-white">
          Place order
        </button>
      </div>

      {status && <div className="mt-4 text-sm text-neutral-700">{status}</div>}
    </main>
  );
}
