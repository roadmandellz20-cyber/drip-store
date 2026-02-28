"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cartTotal, decQty, incQty, readCart, removeFromCart, type CartItem } from "@/lib/cart";
import ProductImage from "@/components/ProductImage";

export default function CartPage() {
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
        <h1 className="page__title">CART</h1>
        <p className="page__sub">Adjust quantities before checkout.</p>
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
                <ProductImage
                  src={item.product.imageUrl}
                  fallbackSrc={item.product.imageFallbackUrl}
                  alt={item.product.name}
                  width={100}
                  height={100}
                  sizes="100px"
                />
                <div className="checkout__meta">
                  <div className="checkout__sku">{item.product.sku}</div>
                  <div className="checkout__name">{item.product.name}</div>
                  <div className="checkout__row checkout__row--actions">
                    <span>Size: {item.size}</span>
                    <div className="checkout__qty">
                      <button className="btn btn--ghost" onClick={() => setItems(decQty(item.id, item.size))}>-</button>
                      <span className="checkout__qtyval">{item.qty}</span>
                      <button className="btn btn--ghost" onClick={() => setItems(incQty(item.id, item.size))}>+</button>
                    </div>
                    <button className="btn btn--ghost" onClick={() => setItems(removeFromCart(item.id, item.size))}>
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
            <Link className="btn btn--primary" href="/checkout">GO TO CHECKOUT</Link>
            <Link className="btn btn--ghost" href="/archive">BACK TO ARCHIVE</Link>
          </div>
        </div>
      )}
    </div>
  );
}
