import ProductGrid from "@/components/ProductGrid";
import { NEW_PRODUCTS } from "@/lib/products";

export default function NewPage() {
  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">NEW</h1>
        <p className="page__sub">Fresh prints. Same chaos.</p>
      </div>
      <ProductGrid products={NEW_PRODUCTS} />
    </div>
  );
}
