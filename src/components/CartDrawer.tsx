"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { useLaunchLive } from "@/hooks/useLaunchLive";
import { useLiveProducts } from "@/hooks/useLiveProducts";
import { getProductBySku, getProductStockText } from "@/lib/products";
import ProductImage from "./ProductImage";

function triggerButtonGlitch(el: HTMLElement | null) {
  if (!el) return;
  el.classList.remove("btn-glitch");
  void el.offsetWidth;
  el.classList.add("btn-glitch");
  window.setTimeout(() => el.classList.remove("btn-glitch"), 220);
}

export default function CartDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
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
    if (open) sync();

    window.addEventListener("storage", sync);
    window.addEventListener("mugen_cart_update", sync);
    window.addEventListener("mugen:cart", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("mugen_cart_update", sync);
      window.removeEventListener("mugen:cart", sync);
    };
  }, [open]);

  useEffect(() => {
    if (liveProducts.length === 0) return;
    persistSyncedCartProducts(liveProducts, items);
  }, [items, liveProducts]);

  const displayItems = useMemo(() => syncCartProducts(liveProducts, items).items, [items, liveProducts]);
  const total = useMemo(() => cartTotal(displayItems), [displayItems]);
  const inventoryState = useMemo(() => getCartInventoryState(displayItems), [displayItems]);

  const onRemove = (id: string, size: CartItem["size"]) => {
    const next = removeFromCart(id, size);
    setItems(next);
  };

  const onInc = (id: string, size: CartItem["size"]) => {
    const next = incQty(id, size);
    setItems(next);
  };

  const onDec = (id: string, size: CartItem["size"]) => {
    const next = decQty(id, size);
    setItems(next);
  };

  return (
    <div className={`drawer ${open ? "drawer--open" : ""}`} role="dialog" aria-modal="true">
      <div className="drawer__backdrop" onClick={onClose} />
      <div className="drawer__panel">
        <div className="drawer__top">
          <div className="drawer__title">CART</div>
          <button className="drawer__close" onClick={onClose}>
            ✕
          </button>
        </div>

        {displayItems.length === 0 ? (
          <div className="drawer__empty">
            Your cart is empty. Don’t move like a tourist.
          </div>
        ) : (
          <div className="drawer__list">
            {displayItems.map((i) => {
              const showSoldOut = live && i.product.soldOut;
              const stockText = getProductStockText(i.product, live);

              return (
                <div className="cart-item" key={`${i.id}-${i.size}`}>
                  <ProductImage
                    className="cart-item__img"
                    src={i.product.imageUrl}
                    fallbackSrc={i.product.imageFallbackUrl}
                    alt={i.product.name}
                    variant="thumb"
                    width={78}
                    height={78}
                    sizes="78px"
                  />
                  <div className="cart-item__meta">
                    <div className="cart-item__sku">{i.product.sku}</div>
                    <div className="cart-item__name">{i.product.name}</div>
                    {i.product.isLimited ? (
                      <div className={`checkout__stock ${showSoldOut ? "checkout__stock--soldout" : ""}`}>
                        {stockText || "DROPS APRIL 1"}
                      </div>
                    ) : null}
                    <div className="cart-item__row">
                      <span>Size: {i.size}</span>
                      <div className="cart-item__qty">
                        <button
                          className="cart-item__qtybtn"
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={(e) => {
                            triggerButtonGlitch(e.currentTarget);
                            onDec(i.id, i.size);
                          }}
                        >
                          -
                        </button>
                        <span className="cart-item__qtyval">{i.qty}</span>
                        <button
                          className="cart-item__qtybtn"
                          type="button"
                          aria-label="Increase quantity"
                          onClick={(e) => {
                            triggerButtonGlitch(e.currentTarget);
                            onInc(i.id, i.size);
                          }}
                          disabled={
                            showSoldOut ||
                            (i.product.isLimited &&
                              i.product.available !== null &&
                              i.qty >= i.product.available)
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="cart-item__row">
                      <span className="cart-item__price">GMD {i.product.price.toLocaleString()}</span>
                      <button
                        className="cart-item__remove"
                        type="button"
                        onClick={(e) => {
                          triggerButtonGlitch(e.currentTarget);
                          onRemove(i.id, i.size);
                        }}
                      >
                        remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="drawer__bottom">
          <div className="drawer__total">
            <span>Total</span>
            <span>GMD {total.toLocaleString()}</span>
          </div>
          {live && inventoryState === "ok" ? (
            <Link className="btn btn--primary" href="/checkout" onClick={onClose}>
              Proceed to Order →
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
        </div>
      </div>
    </div>
  );
}
