"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProductImage from "@/components/ProductImage";
import { useTrustedNow } from "@/components/TrustedNowProvider";
import WaitlistModal from "@/components/WaitlistModal";
import { useLaunchLive } from "@/hooks/useLaunchLive";
import { useLiveProducts } from "@/hooks/useLiveProducts";
import { trackEvent } from "@/lib/analytics";
import { addToCart } from "@/lib/cart";
import { LOCKED_BUTTON_TEXT, LOCKED_STOCK_NOTE_TEXT } from "@/lib/launch-copy";
import { getLaunchDate } from "@/lib/launch";
import {
  warmProductImage,
  warnOnDuplicateLookImage,
} from "@/lib/product-images";
import { getProductUiState, type Product } from "@/lib/products";

function pad2(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

function normalizeImageUrl(value?: string) {
  return typeof value === "string" ? value.trim() : "";
}

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

function DetailCountdownBlocks() {
  const { now, synced } = useTrustedNow();
  const launchDate = useMemo(() => getLaunchDate(new Date(now)), [now]);

  if (!launchDate) return null;

  const diff = launchDate.getTime() - now;
  const isLive = synced && diff <= 0;
  if (isLive) {
    return (
      <div className="launchInline">
        <span className="launchInline__live">DROP IS LIVE</span>
      </div>
    );
  }

  const totalSeconds = Math.floor(Math.max(0, diff) / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  return (
    <div className="launchInline">
      <div className="launchTimer launchTimer--inline" aria-label="Launch countdown">
        <div className="launchTimer__unit">
          <div className="launchTimer__num" suppressHydrationWarning>
            {days}
          </div>
          <div className="launchTimer__label">DAYS</div>
        </div>
        <div className="launchTimer__unit">
          <div className="launchTimer__num" suppressHydrationWarning>
            {pad2(hours)}
          </div>
          <div className="launchTimer__label">HRS</div>
        </div>
        <div className="launchTimer__unit">
          <div className="launchTimer__num" suppressHydrationWarning>
            {pad2(mins)}
          </div>
          <div className="launchTimer__label">MIN</div>
        </div>
        <div className="launchTimer__unit">
          <div className="launchTimer__num" suppressHydrationWarning>
            {pad2(secs)}
          </div>
          <div className="launchTimer__label">SEC</div>
        </div>
      </div>
    </div>
  );
}

function DetailRelatedProductCard({
  product,
  launchLive,
}: {
  product: Product;
  launchLive: boolean;
}) {
  const router = useRouter();
  const [hover, setHover] = useState(false);
  const [leadLoaded, setLeadLoaded] = useState(false);
  const { soldOutUi, scarcityText } = getProductUiState(product, launchLive);
  const addDisabled = !launchLive || soldOutUi;
  const showLaunchNote = product.isLimited && !launchLive;
  const hoverSwapEnabled =
    normalizeImageUrl(product.lookImageUrl) !== normalizeImageUrl(product.imageUrl);
  const cardBrandLine = product.isLimited ? "LIMITED ARCHIVE PIECE" : "ENTER THE MUGEN.";
  const cardRef = useRef<HTMLElement | null>(null);
  const warmedRef = useRef(false);

  const tiltClass = useMemo(() => {
    const seed = product.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const offset = (seed % 7) - 3;
    if (offset < 0) return `p-card--tilt-n${Math.abs(offset)}`;
    if (offset > 0) return `p-card--tilt-p${offset}`;
    return "p-card--tilt-0";
  }, [product.id]);

  useEffect(() => {
    if (!hoverSwapEnabled) {
      warnOnDuplicateLookImage(product);
    }
  }, [hoverSwapEnabled, product]);

  const warmDetailAssets = () => {
    if (warmedRef.current) return;
    warmedRef.current = true;

    router.prefetch(`/product/${product.id}`);
    warmProductImage(product.imageFallbackUrl || product.imageUrl, 1600);
    if (hoverSwapEnabled) {
      warmProductImage(product.lookImageFallbackUrl || product.lookImageUrl, 900);
    }
  };

  const onCop = () => {
    if (addDisabled) return;
    const result = addToCart(product, "M", 1);
    if (result.status === "added") {
      window.dispatchEvent(new CustomEvent("mugen_toast", { detail: "Added to cart." }));
    }
    triggerCardPulse(cardRef.current);
  };

  return (
    <article
      ref={cardRef}
      className={`p-card ${tiltClass} ${product.isLimited ? "p-card--limited" : "p-card--available"} ${soldOutUi ? "p-card--soldout" : ""}`}
      onMouseEnter={() => {
        setHover(hoverSwapEnabled);
        warmDetailAssets();
      }}
      onMouseLeave={() => setHover(false)}
    >
      <div className="p-card__frame">
        <div className="p-card__status">
          <span className="chip chip--ghost">{product.isNew ? "NEW DROP" : "ARCHIVE PRINT"}</span>
        </div>

        <Link
          className={`p-card__imgWrap ${leadLoaded ? "p-card__imgWrap--loaded" : ""} ${soldOutUi ? "p-card__imgWrap--soldout" : ""}`}
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
            variant="grid"
            fill
            loading="lazy"
            sizes="(max-width: 620px) 100vw, (max-width: 980px) 50vw, 33vw"
            onLoadStateChange={setLeadLoaded}
          />
          {hoverSwapEnabled ? (
            <ProductImage
              className={`p-card__img p-card__img--look ${hover ? "is-visible" : ""}`}
              src={product.lookImageUrl}
              fallbackSrc={product.lookImageFallbackUrl}
              alt={`${product.name} lookbook`}
              variant="grid"
              fill
              loading="lazy"
              sizes="(max-width: 620px) 100vw, (max-width: 980px) 50vw, 33vw"
            />
          ) : null}

          <div className="p-card__camglitch" aria-hidden="true" />
        </Link>

        <div className="p-card__meta">
          <div className="p-card__sku">{product.sku}</div>
          <h3 className="p-card__title">{product.name.toUpperCase()}</h3>
          {product.isLimited ? (
            <div className={`p-card__scarcity ${soldOutUi ? "p-card__scarcity--soldout" : ""}`}>
              <div className="p-card__scarcityHead">
                <span className="chip chip--limited">LIMITED ARCHIVE</span>
                {launchLive ? <div className="p-card__scarcityLabel">LIMITED STOCK</div> : null}
              </div>
              {launchLive ? (
                <>
                  {scarcityText ? (
                    <div className={`p-card__stock ${soldOutUi ? "p-card__stock--soldout" : ""}`}>
                      {scarcityText}
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="p-card__stock">{scarcityText}</div>
                  {showLaunchNote ? (
                    <div className="p-card__statusNote">{LOCKED_STOCK_NOTE_TEXT}</div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
          <div className="p-card__brandline">{cardBrandLine}</div>

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
              {soldOutUi ? "SOLD OUT" : launchLive ? "COP" : LOCKED_BUTTON_TEXT}
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
  const liveRelatedProducts = useLiveProducts(relatedProducts);
  const product = liveProduct || initialProduct;
  const { soldOutUi, scarcityText } = getProductUiState(product, launchLive);
  const addDisabled = !launchLive || soldOutUi;
  const detailBrandLine =
    product.isLimited === true ? "LIMITED ARCHIVE PIECE" : "ENTER THE MUGEN.";

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
          <div className="detail__line">{detailBrandLine}</div>

          <div className="detail__price">GMD {product.price.toLocaleString()}</div>
          {product.isLimited ? (
            <div className="detail__stockWrap">
              <div className={`detail__stock ${soldOutUi ? "detail__stock--soldout" : ""}`}>
                <span className="chip chip--limited">LIMITED ARCHIVE</span>
                <span>{scarcityText}</span>
              </div>
              {!launchLive ? <div className="detail__stockNote">{LOCKED_STOCK_NOTE_TEXT}</div> : null}
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
            {!launchLive ? <DetailCountdownBlocks /> : null}

            <div className="detail__buttonRow">
              {!launchLive ? (
                <>
                  <button className="btn btn--primary" onClick={onAdd} disabled type="button">
                    {LOCKED_BUTTON_TEXT}
                  </button>
                  <button className="btn btn--ghost" type="button" onClick={() => setWaitlistOpen(true)}>
                    GET DROP ALERT
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn--primary" onClick={onAdd} disabled={addDisabled} type="button">
                    {soldOutUi ? "SOLD OUT" : "ADD TO CART"}
                  </button>
                  {!soldOutUi ? (
                    <Link className="btn btn--ghost" href="/checkout">
                      GO TO CHECKOUT →
                    </Link>
                  ) : (
                    <button className="btn btn--ghost" type="button" disabled>
                      SOLD OUT
                    </button>
                  )}
                </>
              )}
            </div>
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

      {liveRelatedProducts.length ? (
        <section className="detail__related">
          <div className="detail__label">You may also like</div>
          <div className="grid">
            {liveRelatedProducts.map((relatedProduct) => (
              <DetailRelatedProductCard
                key={relatedProduct.id}
                product={relatedProduct}
                launchLive={launchLive}
              />
            ))}
          </div>
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
