"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LaunchCountdown from "@/components/LaunchCountdown";
import ProductImage from "@/components/ProductImage";
import { useLaunchLive } from "@/hooks/useLaunchLive";
import {
  getCartInventoryState,
  cartTotal,
  clearCart,
  decQty,
  incQty,
  persistSyncedCartProducts,
  readCart,
  removeFromCart,
  syncCartProducts,
  type CartItem,
} from "@/lib/cart";
import { useLiveProducts } from "@/hooks/useLiveProducts";
import { getProductBySku, getProductStockText } from "@/lib/products";
import { createOrderSuccessSummary, writeOrderSuccessSummary } from "@/lib/order-success";

type ShippingForm = {
  name: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  deliveryNote: string;
};

const INITIAL_SHIPPING: ShippingForm = {
  name: "",
  email: "",
  phone: "",
  address1: "",
  address2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "The Gambia",
  deliveryNote: "",
};

function triggerButtonGlitch(el: HTMLElement | null) {
  if (!el) return;
  el.classList.remove("btn-glitch");
  void el.offsetWidth;
  el.classList.add("btn-glitch");
  window.setTimeout(() => el.classList.remove("btn-glitch"), 220);
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [shipping, setShipping] = useState<ShippingForm>(INITIAL_SHIPPING);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
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

  async function onPlaceOrder() {
    if (submitting) return;
    if (!live) {
      setError("LOCKED — Opens April 1");
      return;
    }

    if (displayItems.length === 0) {
      setError("Cart is empty.");
      return;
    }

    if (inventoryState === "sold_out") {
      setError("One or more Limited Archive pieces are sold out.");
      return;
    }

    if (inventoryState === "limited_stock") {
      setError("Limited stock changed. Review your quantities.");
      return;
    }

    setError("");
    setSubmitting(true);

    const idempotencyKey = createIdempotencyKey();
    let succeeded = false;

    try {
      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          idempotencyKey,
          shipping,
          cart: displayItems.map((item) => ({
            productId: item.id,
            slug: item.product.sku,
            qty: item.qty,
            size: item.size,
          })),
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        order_id?: string | null;
        order_ref?: string | null;
        warning?: string;
        email_admin_sent?: boolean | null;
        email_customer_sent?: boolean | null;
        email_error?: string | null;
      };
      console.log("order create response", data);

      if (!response.ok || data.ok !== true) {
        throw new Error(data.error || "Failed to place order.");
      }

      const orderId = typeof data.order_id === "string" ? data.order_id.trim() : "";
      const orderRef = typeof data.order_ref === "string" ? data.order_ref.trim() : "";
      if (!orderId) {
        setError("Order was created but no order reference was returned. Please try again.");
        return;
      }
      if (!orderRef) {
        setError("Order was created but order_ref is missing. Please try again.");
        return;
      }

      if (typeof data.warning === "string" && data.warning.trim()) {
        console.warn("[checkout] order created with warning", data.warning);
      }

      try {
        localStorage.setItem("last_order_id", orderId);
      } catch {
        // Ignore localStorage write failures.
      }

      succeeded = true;
      writeOrderSuccessSummary(
        createOrderSuccessSummary({
          orderId,
          orderRef,
          currency: "GMD",
          total,
          shipping,
          items: displayItems,
        })
      );
      clearCart();
      router.push(
        `/success?order_id=${encodeURIComponent(orderId)}&order_ref=${encodeURIComponent(orderRef)}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      if (!succeeded) {
        setSubmitting(false);
      }
    }
  }

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">CHECKOUT</h1>
        <p className="page__sub">Review your order. Fill shipping details. Place order.</p>
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
              );
            })}
          </div>

          <div className="checkout__side">
            <div className="checkout-form">
              <div className="checkout-form__title">SHIPPING</div>

              <label className="checkout-form__field">
                <span>NAME*</span>
                <input
                  value={shipping.name}
                  onChange={(e) => setShipping((v) => ({ ...v, name: e.target.value }))}
                  placeholder="Name"
                  required
                />
              </label>

              <label className="checkout-form__field">
                <span>EMAIL*</span>
                <input
                  type="email"
                  value={shipping.email}
                  onChange={(e) => setShipping((v) => ({ ...v, email: e.target.value }))}
                  placeholder="Email"
                  required
                />
              </label>

              <label className="checkout-form__field">
                <span>PHONE*</span>
                <input
                  value={shipping.phone}
                  onChange={(e) => setShipping((v) => ({ ...v, phone: e.target.value }))}
                  placeholder="Phone"
                  required
                />
              </label>

              <label className="checkout-form__field">
                <span>ADDRESS LINE 1*</span>
                <input
                  value={shipping.address1}
                  onChange={(e) => setShipping((v) => ({ ...v, address1: e.target.value }))}
                  placeholder="Address"
                  required
                />
              </label>

              <label className="checkout-form__field">
                <span>ADDRESS LINE 2</span>
                <input
                  value={shipping.address2}
                  onChange={(e) => setShipping((v) => ({ ...v, address2: e.target.value }))}
                  placeholder="Apartment, suite, etc"
                />
              </label>

              <div className="checkout-form__row2">
                <label className="checkout-form__field">
                  <span>CITY*</span>
                  <input
                    value={shipping.city}
                    onChange={(e) => setShipping((v) => ({ ...v, city: e.target.value }))}
                    placeholder="City"
                    required
                  />
                </label>

                <label className="checkout-form__field">
                  <span>REGION</span>
                  <input
                    value={shipping.region}
                    onChange={(e) => setShipping((v) => ({ ...v, region: e.target.value }))}
                    placeholder="Region"
                  />
                </label>
              </div>

              <div className="checkout-form__row2">
                <label className="checkout-form__field">
                  <span>POSTAL CODE</span>
                  <input
                    value={shipping.postalCode}
                    onChange={(e) => setShipping((v) => ({ ...v, postalCode: e.target.value }))}
                    placeholder="Postal"
                  />
                </label>

                <label className="checkout-form__field">
                  <span>COUNTRY*</span>
                  <input
                    value={shipping.country}
                    onChange={(e) => setShipping((v) => ({ ...v, country: e.target.value }))}
                    placeholder="Country"
                    required
                  />
                </label>
              </div>

              <label className="checkout-form__field">
                <span>DELIVERY NOTE</span>
                <textarea
                  value={shipping.deliveryNote}
                  onChange={(e) => setShipping((v) => ({ ...v, deliveryNote: e.target.value }))}
                  placeholder="Optional note"
                  rows={4}
                />
              </label>
            </div>

            <div className="checkout__total">
              <span>Total</span>
              <span>GMD {total.toLocaleString()}</span>
            </div>

            {!live ? <LaunchCountdown variant="inline" /> : null}

            <button
              className="btn btn--primary"
              onClick={(e) => {
                triggerButtonGlitch(e.currentTarget);
                void onPlaceOrder();
              }}
              type="button"
              disabled={submitting || !live || inventoryState !== "ok"}
            >
              {submitting
                ? "PROCESSING..."
                : !live
                  ? "LOCKED — Opens April 1"
                  : inventoryState === "sold_out"
                    ? "SOLD OUT"
                    : inventoryState === "limited_stock"
                      ? "LIMITED STOCK"
                      : "PLACE ORDER"}
            </button>

            {error ? <div className="checkout__error">{error}</div> : null}

            <Link
              className="btn btn--ghost"
              href="/archive"
              onClick={(e) => triggerButtonGlitch(e.currentTarget)}
            >
              BACK TO ARCHIVE
            </Link>

            <div className="checkout__note">You will be contacted shortly to complete payment.</div>
          </div>
        </div>
      )}
    </div>
  );
}
