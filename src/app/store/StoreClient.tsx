"use client";

import { useMemo, useState } from "react";
import LaunchCountdown from "@/components/LaunchCountdown";
import ProductGrid from "@/components/ProductGrid";
import WaitlistModal from "@/components/WaitlistModal";
import { useLaunchLive } from "@/hooks/useLaunchLive";
import { LIMITED_STOCK_QTY, type Product } from "@/lib/products";

type StoreSegment = "all" | "limited" | "new";

const SEGMENTS: Array<{ label: string; value: StoreSegment }> = [
  { label: "ALL", value: "all" },
  { label: "LIMITED", value: "limited" },
  { label: "NEW", value: "new" },
];

export default function StoreClient({ products }: { products: Product[] }) {
  const launchLive = useLaunchLive();
  const [q, setQ] = useState("");
  const [segment, setSegment] = useState<StoreSegment>("all");
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  const limitedStats = useMemo(() => {
    const limitedProducts = products.filter((product) => product.isLimited);
    const limitedCount = limitedProducts.length;
    const totalLimitedUnits = limitedProducts.reduce((sum, product) => {
      const stockQty =
        typeof product.stockQty === "number" && product.stockQty > 0 ? product.stockQty : LIMITED_STOCK_QTY;
      return sum + stockQty;
    }, 0);

    return { limitedCount, totalLimitedUnits };
  }, [products]);

  const segmentedProducts = useMemo(() => {
    if (segment === "limited") {
      return products.filter((product) => product.isLimited);
    }

    if (segment === "new") {
      return products.filter((product) => product.isNew);
    }

    return products;
  }, [products, segment]);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    if (!search) return segmentedProducts;

    return segmentedProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(search) ||
        product.sku.toLowerCase().includes(search)
    );
  }, [q, segmentedProducts]);

  return (
    <div className="page">
      <LaunchCountdown />

      <div className="page__head">
        <h1 className="page__title">ALL PRODUCTS</h1>
        <p className="page__sub">Everything in the district. No filler.</p>
      </div>

      <section className="store-controls" aria-label="Store controls">
        <div className="store-controls__row">
          <div className="store-toolbar">
            <div className="store-toolbar__main">
              <div className="segment" role="group" aria-label="Store filters">
                {SEGMENTS.map((item) => (
                  <button
                    key={item.value}
                    className={`segment__toggle ${segment === item.value ? "is-active" : ""}`}
                    type="button"
                    aria-pressed={segment === item.value}
                    onClick={() => setSegment(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {limitedStats.limitedCount ? (
                <div className="segment__meta">
                  LIMITED: {limitedStats.limitedCount}{" "}
                  {limitedStats.limitedCount === 1 ? "design" : "designs"} • {LIMITED_STOCK_QTY} each •{" "}
                  {limitedStats.totalLimitedUnits} total
                </div>
              ) : null}
            </div>

            {!launchLive ? (
              <button className="btn btn--ghost" type="button" onClick={() => setWaitlistOpen(true)}>
                GET DROP ALERT
              </button>
            ) : null}
          </div>
        </div>

        <div id="search" className="searchbar searchbar--store">
          <input
            className="searchbar__input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${segment === "all" ? "the full district" : segment} by name or SKU…`}
          />
        </div>
      </section>

      <ProductGrid products={filtered} />

      <WaitlistModal
        open={waitlistOpen && !launchLive}
        onClose={() => setWaitlistOpen(false)}
        source="store"
      />
    </div>
  );
}
