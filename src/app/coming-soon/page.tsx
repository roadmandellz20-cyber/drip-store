import type { Metadata } from "next";
import ProductGrid from "@/components/ProductGrid";
import { fetchComingSoonProducts } from "@/lib/products-server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Coming Soon — Next Archive | MUGEN DISTRICT",
  description: "The next archive is being assembled. Mugen District.",
  alternates: { canonical: "/coming-soon" },
};

export default async function ComingSoonPage() {
  const products = await fetchComingSoonProducts();

  return (
    <div className="page">
      <div className="page__head">
        <p className="page__kicker">NEXT ARCHIVE</p>
        <h1 className="page__title">COMING SOON</h1>
      </div>
      {products.length === 0 ? (
        <p className="page__empty">THE NEXT ARCHIVE IS BEING ASSEMBLED.</p>
      ) : (
        <ProductGrid products={products} priorityCount={0} />
      )}
    </div>
  );
}
