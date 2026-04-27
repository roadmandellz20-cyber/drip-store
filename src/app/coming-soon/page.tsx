import type { Metadata } from "next";
import ProductGrid from "@/components/ProductGrid";
import { fetchComingSoonProducts } from "@/lib/products-server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Coming Soon — Next Archive",
  description: "The next drop is loading. Mugen District.",
  alternates: { canonical: "/coming-soon" },
};

export default async function ComingSoonPage() {
  const products = await fetchComingSoonProducts();

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">COMING SOON</h1>
        <p className="page__sub">Next archive. Incoming.</p>
      </div>
      {products.length === 0 ? (
        <p className="page__empty">Nothing confirmed yet. Stay locked.</p>
      ) : (
        <ProductGrid products={products} priorityCount={0} />
      )}
    </div>
  );
}
