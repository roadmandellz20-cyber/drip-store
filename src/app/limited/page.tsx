import ProductGrid from "@/components/ProductGrid";
import { LIMITED_PRODUCTS } from "@/lib/products";

export default function LimitedPage() {
  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">LIMITED</h1>
        <p className="page__sub">No mass restocks. Don’t sleep.</p>
      </div>
      <ProductGrid products={LIMITED_PRODUCTS} />
    </div>
  );
}
