import ProductGrid from "@/components/ProductGrid";
import { fetchProductsWithInventory } from "@/lib/products-server";

export const dynamic = "force-dynamic";

export default async function LimitedPage() {
  const products = await fetchProductsWithInventory();
  const limitedProducts = products.filter((product) => product.isLimited);

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">LIMITED</h1>
        <p className="page__sub">No mass restocks. Don’t sleep.</p>
      </div>
      <ProductGrid products={limitedProducts} />
    </div>
  );
}
