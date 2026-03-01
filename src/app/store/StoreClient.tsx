"use client";

import { useMemo, useState } from "react";
import LaunchCountdown from "@/components/LaunchCountdown";
import ProductGrid from "@/components/ProductGrid";
import type { Product } from "@/lib/products";

export default function StoreClient({ products }: { products: Product[] }) {
  const [q, setQ] = useState("");

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

      <div id="search" className="searchbar">
        <input
          className="searchbar__input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or SKU…"
        />
      </div>

      <ProductGrid products={filtered} />
    </div>
  );
}
