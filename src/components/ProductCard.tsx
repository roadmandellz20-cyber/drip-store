"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { addToCart } from "@/lib/cart";
import { warmProductImage } from "@/lib/product-images";
import { getProductStockText, type Product } from "@/lib/products";
import ProductImage from "./ProductImage";

function triggerButtonGlitch(el: HTMLElement | null) {
  if (!el) return;
  el.classList.remove("btn-glitch");
  void el.offsetWidth;
  el.classList.add("btn-glitch");
  window.setTimeout(() => el.classList.remove("btn-glitch"), 220);
}

function triggerCardPulse(el: HTMLElement | null) {
  if (!el) return;
  el.classList.remove("p-card--pulse");
  void el.offsetWidth;
  el.classList.add("p-card--pulse");
  window.setTimeout(() => el.classList.remove("p-card--pulse"), 140);
}

export default function ProductCard({
  product,
  priority = false,
  launchLive,
}: {
  product: Product;
  priority?: boolean;
  launchLive: boolean;
}) {
  const router = useRouter();
  const [hover, setHover] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);
  const warmedRef = useRef(false);

  const soldOutUi = launchLive && product.soldOut;
  const stockText = getProductStockText(product, launchLive);
  const addDisabled = !launchLive || soldOutUi;

  const tilt = useMemo(() => {
    const seed = product.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const deg = ((seed % 7) - 3) * 0.6;
    return deg;
  }, [product.id]);

  const onCop = () => {
    if (addDisabled) return;
    const result = addToCart(product, "M", 1);
    if (result.status === "added") {
      window.dispatchEvent(new CustomEvent("mugen_toast", { detail: "Added to cart." }));
    }
    triggerCardPulse(cardRef.current);
  };

  const warmDetailAssets = () => {
    if (warmedRef.current) return;
    warmedRef.current = true;

    router.prefetch(`/product/${product.id}`);
    warmProductImage(product.imageFallbackUrl || product.imageUrl, 1600);
    warmProductImage(product.lookImageFallbackUrl || product.lookImageUrl, 900);
  };

  return (
    <article
      ref={cardRef}
      className={`p-card ${product.isLimited ? "p-card--limited" : "p-card--available"} ${soldOutUi ? "p-card--soldout" : ""}`}
      style={{ transform: `rotate(${tilt}deg)` }}
      onMouseEnter={() => {
        setHover(true);
        warmDetailAssets();
      }}
      onMouseLeave={() => setHover(false)}
    >
      <div className="p-card__frame">
        <div className="p-card__status">
          {product.isLimited ? <span className="chip chip--limited">LIMITED ARCHIVE</span> : null}
          <span className="chip chip--ghost">{product.isNew ? "NEW DROP" : "ARCHIVE PRINT"}</span>
        </div>

        <Link
          className={`p-card__imgWrap ${soldOutUi ? "p-card__imgWrap--soldout" : ""}`}
          href={`/product/${product.id}`}
          aria-label={product.name}
          onTouchStart={warmDetailAssets}
          onFocus={warmDetailAssets}
        >
          <ProductImage
            className={`p-card__img ${hover ? "is-hidden" : ""}`}
            src={product.imageUrl}
            fallbackSrc={product.imageFallbackUrl}
            alt={product.name}
            fill
            priority={priority}
            sizes="(max-width: 620px) 100vw, (max-width: 980px) 50vw, 33vw"
          />
          <ProductImage
            className={`p-card__img p-card__img--look ${hover ? "is-visible" : ""}`}
            src={product.lookImageUrl}
            fallbackSrc={product.lookImageFallbackUrl}
            alt={`${product.name} lookbook`}
            fill
            sizes="(max-width: 620px) 100vw, (max-width: 980px) 50vw, 33vw"
          />

          <div className="p-card__camglitch" aria-hidden="true" />
        </Link>

        <div className="p-card__meta">
          <div className="p-card__sku">{product.sku}</div>
          <h3 className="p-card__title">{product.name.toUpperCase()}</h3>
          {product.isLimited ? (
            <div className={`p-card__scarcity ${soldOutUi ? "p-card__scarcity--soldout" : ""}`}>
              {launchLive ? (
                <>
                  <div className="p-card__scarcityLabel">LIMITED STOCK</div>
                  {stockText ? (
                    <div className={`p-card__stock ${soldOutUi ? "p-card__stock--soldout" : ""}`}>
                      {stockText}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="p-card__stock">{stockText}</div>
              )}
            </div>
          ) : null}
          <div className="p-card__brandline">{product.brandLine}</div>

          <div className="p-card__row">
            <button
              className={`btn ${product.isLimited ? "btn--primary" : "btn--ghost"}`}
              onClick={(e) => {
                triggerButtonGlitch(e.currentTarget);
                onCop();
              }}
              type="button"
              disabled={addDisabled}
            >
              {soldOutUi ? "SOLD OUT" : launchLive ? "COP" : "LOCKED — Opens April 1"}
            </button>

            <div className="p-card__price">GMD {product.price.toLocaleString()}</div>

            <Link
              className="p-card__view"
              href={`/product/${product.id}`}
              onClick={(e) => triggerButtonGlitch(e.currentTarget)}
              onTouchStart={warmDetailAssets}
              onFocus={warmDetailAssets}
            >
              view →
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
