"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ProductImage from "@/components/ProductImage";
import LaunchCountdown from "@/components/LaunchCountdown";
import { useLaunchLive } from "@/hooks/useLaunchLive";
import { useLiveProducts } from "@/hooks/useLiveProducts";
import { addToCart } from "@/lib/cart";
import { getProductStockText, type Product } from "@/lib/products";

export default function ProductDetailClient({
  initialProduct,
}: {
  initialProduct: Product;
}) {
  const [size, setSize] = useState<"S" | "M" | "L" | "XL">("M");
  const live = useLaunchLive();
  const [liveProduct] = useLiveProducts([initialProduct]);
  const product = liveProduct || initialProduct;
  const addDisabled = !live || product.soldOut;
  const stockText = getProductStockText(product);

  const sizeOptions = useMemo(() => ["S", "M", "L", "XL"] as const, []);

  const onAdd = () => {
    if (!live || product.soldOut) return;

    const result = addToCart(product, size, 1);
    if (result.status === "added") {
      window.dispatchEvent(new CustomEvent("mugen_toast", { detail: "Added to cart." }));
    }
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
          {product.isLimited ? (
            <div className={`detail__stock ${product.soldOut ? "detail__stock--soldout" : ""}`}>
              <span className="chip chip--limited">LIMITED ARCHIVE</span>
              <span>{stockText}</span>
            </div>
          ) : null}

          <div className="detail__desc">
            {product.description.split("\n").map((text, idx) =>
              text.trim() ? <p key={idx}>{text}</p> : null
            )}
          </div>

          <div className="detail__opts">
            <div className="detail__label">Size</div>
            <div className="sizes">
              {sizeOptions.map((option) => (
                <button
                  key={option}
                  className={`size ${size === option ? "size--active" : ""}`}
                  onClick={() => setSize(option)}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="detail__actions">
            {!live ? <LaunchCountdown variant="inline" /> : null}

            <button className="btn btn--primary" onClick={onAdd} disabled={addDisabled} type="button">
              {product.soldOut ? "SOLD OUT" : live ? "ADD TO CART" : "LOCKED — Opens April 1"}
            </button>
            {live && !product.soldOut ? (
              <Link className="btn btn--ghost" href="/checkout">
                GO TO CHECKOUT →
              </Link>
            ) : (
              <button className="btn btn--ghost" type="button" disabled>
                {product.soldOut ? "SOLD OUT" : "LOCKED — Opens April 1"}
              </button>
            )}
          </div>

          <div className="detail__list">
            <div className="detail__label">Details</div>
            <ul>
              {product.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
