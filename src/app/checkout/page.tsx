"use client";

import { useEffect, useMemo, useState } from "react";
import { cartTotal, readCart, type CartItem } from "@/lib/cart";
import Link from "next/link";

export default function CheckoutPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(readCart());
  }, []);

  const total = useMemo(() => cartTotal(items), [items]);

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">CHECKOUT</h1>
        <p className="page__sub">Review your order. Then proceed.</p>
      </div>

      {items.length === 0 ? (
        <div className="empty">
          Cart is empty. <Link href="/store">Go shop →</Link>
        </div>
      ) : (
        <div className="checkout">
          <div className="checkout__list">
            {items.map((i) => (
              <div className="checkout__item" key={`${i.id}-${i.size}`}>
                <img src={i.product.image} alt={i.product.name} />
                <div className="checkout__meta">
                  <div className="checkout__sku">{i.product.sku}</div>
                  <div className="checkout__name">{i.product.name}</div>
                  <div className="checkout__row">
                    <span>Size: {i.size}</span>
                    <span>Qty: {i.qty}</span>
                  </div>
                </div>
                <div className="checkout__price">
                  GMD {(i.product.price * i.qty).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className="checkout__side">
            <div className="checkout__total">
              <span>Total</span>
              <span>GMD {total.toLocaleString()}</span>
            </div>

            <button
              className="btn btn--primary"
              onClick={() => alert("Proceed to Order: wire this to WhatsApp/Email/Stripe later.")}
            >
              Proceed to Order →
            </button>

            <div className="checkout__note">
              Shipping: 24–48h (local). No mass restocks.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
