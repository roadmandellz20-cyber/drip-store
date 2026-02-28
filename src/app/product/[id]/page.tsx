"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getProduct } from "@/lib/products";
import { addToCart } from "@/lib/cart";
import Link from "next/link";
import ProductImage from "@/components/ProductImage";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const product = useMemo(() => getProduct(params.id), [params.id]);
  const [size, setSize] = useState<"S" | "M" | "L" | "XL">("M");

  if (!product) {
    return (
      <div className="page">
        <div className="page__head">
          <h1 className="page__title">NOT FOUND</h1>
          <p className="page__sub">That product doesn’t exist.</p>
          <Link className="btn btn--primary" href="/store">
            Back to store →
          </Link>
        </div>
      </div>
    );
  }

  const onAdd = () => {
    addToCart(product, size, 1);
    window.dispatchEvent(new CustomEvent("mugen_toast", { detail: "Added to cart." }));
  };

  return (
    <div className="page">
      <div className="detail">
        <div className="detail__img">
          <ProductImage
            className="detail__media"
            src={product.imageUrl}
            fallbackSrc={product.imageFallbackUrl}
            alt={product.name}
            width={1600}
            height={1600}
            priority
            sizes="(max-width: 900px) 100vw, 55vw"
          />
        </div>

        <div className="detail__info">
          <div className="detail__sku">{product.sku}</div>
          <h1 className="detail__title">{product.name}</h1>
          <div className="detail__line">{product.brandLine}</div>

          <div className="detail__price">GMD {product.price.toLocaleString()}</div>

          <div className="detail__desc">
            {product.description.split("\n").map((t, idx) =>
              t.trim() ? <p key={idx}>{t}</p> : null
            )}
          </div>

          <div className="detail__opts">
            <div className="detail__label">Size</div>
            <div className="sizes">
              {(["S", "M", "L", "XL"] as const).map((s) => (
                <button
                  key={s}
                  className={`size ${size === s ? "size--active" : ""}`}
                  onClick={() => setSize(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="detail__actions">
            <button className="btn btn--primary" onClick={onAdd}>
              Add to Cart
            </button>
            <Link className="btn btn--ghost" href="/checkout">
              Go to Checkout →
            </Link>
          </div>

          <div className="detail__list">
            <div className="detail__label">Details</div>
            <ul>
              {product.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
