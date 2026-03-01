import type { Metadata } from "next";
import ProductGrid from "@/components/ProductGrid";
import { fetchProductsWithInventory } from "@/lib/products-server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Limited",
  description: "Each limited piece is capped. No restocks. When it's gone, it's archived.",
  alternates: {
    canonical: "/limited",
  },
};

export default async function LimitedPage() {
  const products = await fetchProductsWithInventory();
  const limitedProducts = products.filter((product) => product.isLimited);

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">LIMITED</h1>
        <p className="page__sub">Each limited piece is capped. No restocks. When it&apos;s gone, it&apos;s archived.</p>
      </div>
      <ProductGrid products={limitedProducts} />
    </div>
  );
}
