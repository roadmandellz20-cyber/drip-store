import type { Product } from "@/lib/products";
import ProductCard from "./ProductCard";

export default function ProductGrid({ products }: { products: Product[] }) {
  return (
    <section className="grid">
      {products.map((p, index) => (
        <ProductCard key={p.id} product={p} priority={index < 4} />
      ))}
    </section>
  );
}
