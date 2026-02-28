"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { Product } from "@/lib/products";
import { addToCart } from "@/lib/cart";
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
  const [hover, setHover] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);

  const status = product.limited ? "LIMITED" : "AVAILABLE";

  const tilt = useMemo(() => {
    // controlled chaos: deterministic tilt from id (no Math.random hydration issues)
    const seed = product.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const deg = ((seed % 7) - 3) * 0.6; // -1.8..+1.8
    return deg;
  }, [product.id]);

  const onCop = () => {
    if (!launchLive) return;
    addToCart(product, "M", 1);
    window.dispatchEvent(new CustomEvent("mugen_toast", { detail: "Added to cart." }));
    triggerCardPulse(cardRef.current);
  };

  return (
    <article
      ref={cardRef}
      className={`p-card ${product.limited ? "p-card--limited" : "p-card--available"}`}
      style={{ transform: `rotate(${tilt}deg)` }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="p-card__frame">
        <div className="p-card__status">
          <span className="chip">{status}</span>
          <span className="chip chip--ghost">{product.isNew ? "NEW DROP" : "ARCHIVE PRINT"}</span>
        </div>

        <Link className="p-card__imgWrap" href={`/product/${product.id}`} aria-label={product.name}>
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
          <div className="p-card__brandline">{product.brandLine}</div>

          <div className="p-card__row">
            <button
              className={`btn ${product.limited ? "btn--primary" : "btn--ghost"}`}
              onClick={(e) => {
                triggerButtonGlitch(e.currentTarget);
                onCop();
              }}
              type="button"
              disabled={!launchLive}
            >
              {launchLive ? "COP" : "LOCKED — Opens April 1"}
            </button>

            <div className="p-card__price">GMD {product.price.toLocaleString()}</div>

            <Link
              className="p-card__view"
              href={`/product/${product.id}`}
              onClick={(e) => triggerButtonGlitch(e.currentTarget)}
            >
              view →
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
