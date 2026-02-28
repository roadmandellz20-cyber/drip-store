"use client";

import { useMemo, useState } from "react";
import LaunchCountdown from "@/components/LaunchCountdown";
import ProductGrid from "@/components/ProductGrid";
import { ALL_PRODUCTS } from "@/lib/products";

export default function StorePage() {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return ALL_PRODUCTS;
    return ALL_PRODUCTS.filter((p) => p.name.toLowerCase().includes(s) || p.sku.includes(s));
  }, [q]);

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
