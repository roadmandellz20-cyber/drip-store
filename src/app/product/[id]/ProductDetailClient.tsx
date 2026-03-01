"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProductGrid from "@/components/ProductGrid";
import ProductImage from "@/components/ProductImage";
import LaunchCountdown from "@/components/LaunchCountdown";
import WaitlistModal from "@/components/WaitlistModal";
import { useLaunchLive } from "@/hooks/useLaunchLive";
import { useLiveProducts } from "@/hooks/useLiveProducts";
import { trackEvent } from "@/lib/analytics";
import { addToCart } from "@/lib/cart";
import { getProductUiState, LIMITED_STOCK_QTY, type Product } from "@/lib/products";

export default function ProductDetailClient({
  initialProduct,
  relatedProducts,
}: {
  initialProduct: Product;
  relatedProducts: Product[];
}) {
  const [size, setSize] = useState<"S" | "M" | "L" | "XL">("M");
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const launchLive = useLaunchLive();
  const [liveProduct] = useLiveProducts([initialProduct]);
  const product = liveProduct || initialProduct;
  const { soldOutUi, scarcityText } = getProductUiState(product, launchLive);
  const addDisabled = !launchLive || soldOutUi;
  const lockedQty =
    typeof product.stockQty === "number" && product.stockQty > 0 ? product.stockQty : LIMITED_STOCK_QTY;

  const sizeOptions = useMemo(() => ["S", "M", "L", "XL"] as const, []);

  useEffect(() => {
    trackEvent("view_product", {
      id: product.id,
      sku: product.sku,
      name: product.name,
      limited: product.isLimited,
      price: product.price,
    });
  }, [product.id, product.isLimited, product.name, product.price, product.sku]);

  const onAdd = () => {
    if (!launchLive || soldOutUi) return;

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
            variant="detail"
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
            <div className="detail__stockWrap">
              <div className={`detail__stock ${soldOutUi ? "detail__stock--soldout" : ""}`}>
                <span className="chip chip--limited">LIMITED ARCHIVE</span>
                <span>{scarcityText}</span>
              </div>
              {!launchLive ? <div className="detail__stockNote">{lockedQty} made. Opens April 1.</div> : null}
              <div className="detail__stockSubline">Archive run. No restocks.</div>
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
            {!launchLive ? <LaunchCountdown variant="inline" /> : null}

            <button className="btn btn--primary" onClick={onAdd} disabled={addDisabled} type="button">
              {soldOutUi ? "SOLD OUT" : launchLive ? "ADD TO CART" : "LOCKED — Opens April 1"}
            </button>
            {!launchLive ? (
              <button className="btn btn--ghost" type="button" onClick={() => setWaitlistOpen(true)}>
                GET DROP ALERT
              </button>
            ) : !soldOutUi ? (
              <Link className="btn btn--ghost" href="/checkout">
                GO TO CHECKOUT →
              </Link>
            ) : (
              <button className="btn btn--ghost" type="button" disabled>
                SOLD OUT
              </button>
            )}
          </div>

          <div className="detail__trust">
            <div className="detail__trustCard">
              <div className="detail__label">DROP RULES</div>
              <ul className="detail__trustList">
                <li>No mass restocks</li>
                <li>Ships 24–48h after drop (Gambia)</li>
                <li>Limited windows</li>
              </ul>
            </div>
            <div className="detail__trustCard">
              <div className="detail__label">SIZE / FIT</div>
              <p>Relaxed streetwear fit. Size up for oversized.</p>
            </div>
            <div className="detail__trustCard">
              <div className="detail__label">CARE</div>
              <p>Cold wash. Hang dry.</p>
            </div>
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

      {relatedProducts.length ? (
        <section className="detail__related">
          <div className="detail__label">You may also like</div>
          <ProductGrid products={relatedProducts} priorityCount={0} />
        </section>
      ) : null}

      <WaitlistModal
        open={waitlistOpen && !launchLive}
        onClose={() => setWaitlistOpen(false)}
        source="product"
        productSku={product.sku}
      />
    </div>
  );
}
