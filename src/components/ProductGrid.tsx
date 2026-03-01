"use client";

import type { Product } from "@/lib/products";
import { useLaunchLive } from "@/hooks/useLaunchLive";
import { useLiveProducts } from "@/hooks/useLiveProducts";
import ProductCard from "./ProductCard";

export default function ProductGrid({
  products,
  priorityCount = 2,
}: {
  products: Product[];
  priorityCount?: number;
}) {
  const launchLive = useLaunchLive();
  const liveProducts = useLiveProducts(products);

  return (
    <section className="grid">
      {liveProducts.map((p, index) => (
        <ProductCard
          key={p.id}
          product={p}
          priority={index < priorityCount}
          launchLive={launchLive}
        />
      ))}
    </section>
  );
}
