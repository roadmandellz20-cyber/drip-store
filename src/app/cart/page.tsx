"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  cartTotal,
  decQty,
  getCartInventoryState,
  incQty,
  persistSyncedCartProducts,
  readCart,
  removeFromCart,
  syncCartProducts,
  type CartItem,
} from "@/lib/cart";
import ProductImage from "@/components/ProductImage";
import { useLaunchLive } from "@/hooks/useLaunchLive";
import { useLiveProducts } from "@/hooks/useLiveProducts";
import { getProductBySku, getProductStockText } from "@/lib/products";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const live = useLaunchLive();
  const cartProducts = useMemo(
    () =>
      items
        .map((item) => getProductBySku(item.product.sku))
        .filter((product): product is NonNullable<typeof product> => Boolean(product)),
    [items]
  );
  const liveProducts = useLiveProducts(cartProducts);

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

  useEffect(() => {
    if (liveProducts.length === 0) return;
    persistSyncedCartProducts(liveProducts, items);
  }, [items, liveProducts]);

  const displayItems = useMemo(() => syncCartProducts(liveProducts, items).items, [items, liveProducts]);
  const total = useMemo(() => cartTotal(displayItems), [displayItems]);
  const inventoryState = useMemo(() => getCartInventoryState(displayItems), [displayItems]);

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">CART</h1>
        <p className="page__sub">Adjust quantities before checkout.</p>
      </div>

      {displayItems.length === 0 ? (
        <div className="empty">
          Cart is empty. <Link className="btn btn--ghost" href="/store">ENTER STORE</Link>
        </div>
      ) : (
        <div className="checkout">
          <div className="checkout__list">
            {displayItems.map((item) => {
              const showSoldOut = live && item.product.soldOut;
              const stockText = getProductStockText(item.product, live);

              return (
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
                    {item.product.isLimited ? (
                      <div className={`checkout__stock ${showSoldOut ? "checkout__stock--soldout" : ""}`}>
                        {stockText || "DROPS APRIL 1"}
                      </div>
                    ) : null}
                    <div className="checkout__row checkout__row--actions">
                      <span>Size: {item.size}</span>
                      <div className="checkout__qty">
                        <button className="btn btn--ghost" onClick={() => setItems(decQty(item.id, item.size))}>-</button>
                        <span className="checkout__qtyval">{item.qty}</span>
                        <button
                          className="btn btn--ghost"
                          onClick={() => setItems(incQty(item.id, item.size))}
                          disabled={
                            showSoldOut ||
                            (item.product.isLimited &&
                              item.product.available !== null &&
                              item.qty >= item.product.available)
                          }
                        >
                          +
                        </button>
                      </div>
                      <button className="btn btn--ghost" onClick={() => setItems(removeFromCart(item.id, item.size))}>
                        REMOVE
                      </button>
                    </div>
                  </div>
                  <div className="checkout__price">GMD {(item.product.price * item.qty).toLocaleString()}</div>
                </div>
              );
            })}
          </div>

          <div className="checkout__side">
            <div className="checkout__total">
              <span>Total</span>
              <span>GMD {total.toLocaleString()}</span>
            </div>
            {live && inventoryState === "ok" ? (
              <Link className="btn btn--primary" href="/checkout">
                GO TO CHECKOUT
              </Link>
            ) : (
              <button className="btn btn--primary" type="button" disabled>
                {!live
                  ? "LOCKED — Opens April 1"
                  : inventoryState === "sold_out"
                    ? "SOLD OUT"
                    : "LIMITED STOCK"}
              </button>
            )}
            <Link className="btn btn--ghost" href="/archive">BACK TO ARCHIVE</Link>
          </div>
        </div>
      )}
    </div>
  );
}
