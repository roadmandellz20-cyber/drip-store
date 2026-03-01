"use client";

import { useMemo, useState } from "react";
import LaunchCountdown from "@/components/LaunchCountdown";
import ProductGrid from "@/components/ProductGrid";
import WaitlistModal from "@/components/WaitlistModal";
import { useLaunchLive } from "@/hooks/useLaunchLive";
import { type Product } from "@/lib/products";

export default function StoreClient({ products }: { products: Product[] }) {
  const launchLive = useLaunchLive();
  const [q, setQ] = useState("");
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    if (!search) return products;

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(search) ||
        product.sku.toLowerCase().includes(search)
    );
  }, [products, q]);

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
            placeholder="Search the full district by name or SKU…"
          />
        </div>
      </section>

      <ProductGrid products={filtered} priorityCount={2} />

      <WaitlistModal
        open={waitlistOpen && !launchLive}
        onClose={() => setWaitlistOpen(false)}
        source="store"
      />
    </div>
  );
}
