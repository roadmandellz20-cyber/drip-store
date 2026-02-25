"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CartItem, cartTotal, getCart, removeFromCart, updateQty } from "@/lib/cart";
import { formatMoney } from "@/lib/money";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  const refresh = () => setItems(getCart());

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 500);
    return () => clearInterval(i);
  }, []);

  const total = cartTotal(items);
  const currency = items[0]?.currency || "USD";

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Cart</h1>

      {items.length === 0 ? (
        <div className="mt-8 rounded-3xl border p-8">
          <div className="text-neutral-700">Nothing here yet.</div>
          <Link href="/store" className="mt-4 inline-block rounded-2xl bg-black px-5 py-3 text-sm text-white">
            Go to store
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 space-y-4">
            {items.map((x) => (
              <div key={`${x.productId}_${x.size}`} className="flex gap-4 rounded-3xl border p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={x.cover || "https://placehold.co/200x250/png"}
                  alt={x.title}
                  className="h-24 w-20 rounded-2xl object-cover"
                />
                <div className="flex-1">
                  <div className="font-medium">{x.title}</div>
                  <div className="mt-1 text-sm text-neutral-600">Size: {x.size}</div>
                  <div className="mt-2 text-sm">{formatMoney(x.priceCents, x.currency)}</div>

                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      value={x.qty}
                      onChange={(e) => {
                        updateQty(x.productId, x.size, Number(e.target.value));
                        refresh();
                      }}
                      className="w-20 rounded-xl border px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => {
                        removeFromCart(x.productId, x.size);
                        refresh();
                      }}
                      className="text-sm text-neutral-600 hover:text-black"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between rounded-3xl border p-6">
            <div>
              <div className="text-sm text-neutral-600">Total</div>
              <div className="text-xl font-semibold">{formatMoney(total, currency)}</div>
            </div>
            <Link href="/checkout" className="rounded-2xl bg-black px-5 py-3 text-sm text-white">
              Checkout
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
