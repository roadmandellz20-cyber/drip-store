import Link from "next/link";
import ProductDetailClient from "./ProductDetailClient";
import { getProduct } from "@/lib/products";
import { fetchProductsWithInventory } from "@/lib/products-server";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = await params;
  const productId = resolvedParams.id;
  const [liveProduct] = await fetchProductsWithInventory([productId]);
  const fallbackProduct = getProduct(productId);
  const product = liveProduct || fallbackProduct;

  if (!product) {
    return (
      <div className="page">
        <div className="page__head">
          <h1 className="page__title">NOT FOUND</h1>
          <p className="page__sub">That product doesn’t exist.</p>
          <Link className="btn btn--primary" href="/store">
            Back to store →
          </Link>
        </div>
      </div>
    );
  }

  return <ProductDetailClient initialProduct={product} />;
}
