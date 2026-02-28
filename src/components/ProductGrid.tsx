"use client";

import type { Product } from "@/lib/products";
import { useLaunchLive } from "@/hooks/useLaunchLive";
import ProductCard from "./ProductCard";

export default function ProductGrid({ products }: { products: Product[] }) {
  const launchLive = useLaunchLive();

  return (
    <section className="grid">
      {products.map((p, index) => (
        <ProductCard key={p.id} product={p} priority={index < 4} launchLive={launchLive} />
      ))}
    </section>
  );
}
