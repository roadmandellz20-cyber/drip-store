import type { Metadata } from "next";
import ProductGrid from "@/components/ProductGrid";
import { fetchProductsWithInventory } from "@/lib/products-server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "New",
  description: "Fresh prints. Same chaos. Browse the latest Mugen District drops.",
  alternates: {
    canonical: "/new",
  },
};

export default async function NewPage() {
  const products = await fetchProductsWithInventory();
  const newProducts = products.filter((product) => product.isNew);

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">NEW</h1>
        <p className="page__sub">Fresh prints. Same chaos.</p>
      </div>
      <ProductGrid products={newProducts} priorityCount={0} />
    </div>
  );
}
