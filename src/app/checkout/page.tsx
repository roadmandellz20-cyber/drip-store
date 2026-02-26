"use client";

import { useEffect, useMemo, useState } from "react";
import {
  cartTotal,
  decQty,
  incQty,
  readCart,
  removeFromCart,
  type CartItem,
} from "@/lib/cart";
import Link from "next/link";

function triggerButtonGlitch(el: HTMLElement | null) {
  if (!el) return;
  el.classList.remove("btn-glitch");
  void el.offsetWidth;
  el.classList.add("btn-glitch");
  window.setTimeout(() => el.classList.remove("btn-glitch"), 220);
}

export default function CheckoutPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const sync = () => setItems(readCart());
    sync();

    window.addEventListener("storage", sync);
    window.addEventListener("mugen_cart_update", sync);
    window.addEventListener("mugen:cart", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("mugen_cart_update", sync);
      window.removeEventListener("mugen:cart", sync);
    };
  }, []);

  const total = useMemo(() => cartTotal(items), [items]);

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">CHECKOUT</h1>
        <p className="page__sub">Review your order. Adjust quantities. Proceed.</p>
      </div>

      {items.length === 0 ? (
        <div className="empty">
          Cart is empty. <Link className="btn btn--ghost" href="/store">ENTER STORE</Link>
        </div>
      ) : (
        <div className="checkout">
          <div className="checkout__list">
            {items.map((item) => (
              <div className="checkout__item" key={`${item.id}-${item.size}`}>
                <img src={item.product.image} alt={item.product.name} loading="lazy" />

                <div className="checkout__meta">
                  <div className="checkout__sku">{item.product.sku}</div>
                  <div className="checkout__name">{item.product.name}</div>
                  <div className="checkout__row">
                    <span>Size: {item.size}</span>
                    <div className="checkout__qty">
                      <button
                        className="btn btn--ghost"
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={(e) => {
                          triggerButtonGlitch(e.currentTarget);
                          setItems(decQty(item.id, item.size));
                        }}
                      >
                        -
                      </button>

                      <span className="checkout__qtyval">{item.qty}</span>

                      <button
                        className="btn btn--ghost"
                        type="button"
                        aria-label="Increase quantity"
                        onClick={(e) => {
                          triggerButtonGlitch(e.currentTarget);
                          setItems(incQty(item.id, item.size));
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="checkout__row checkout__row--actions">
                    <span className="checkout__unit">GMD {item.product.price.toLocaleString()}</span>
                    <button
                      className="btn btn--ghost"
                      type="button"
                      onClick={(e) => {
                        triggerButtonGlitch(e.currentTarget);
                        setItems(removeFromCart(item.id, item.size));
                      }}
                    >
                      REMOVE
                    </button>
                  </div>
                </div>

                <div className="checkout__price">GMD {(item.product.price * item.qty).toLocaleString()}</div>
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
              onClick={(e) => {
                triggerButtonGlitch(e.currentTarget);
                alert("Proceed to Order: wire this to WhatsApp/Email/Stripe later.");
              }}
              type="button"
            >
              CHECKOUT
            </button>

            <Link
              className="btn btn--ghost"
              href="/archive"
              onClick={(e) => triggerButtonGlitch(e.currentTarget)}
            >
              BACK TO ARCHIVE
            </Link>

            <div className="checkout__note">Shipping: 24-48h (local). No mass restocks.</div>
          </div>
        </div>
      )}
    </div>
  );
}
