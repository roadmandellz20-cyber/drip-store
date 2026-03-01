import StoreClient from "./StoreClient";
import { fetchProductsWithInventory } from "@/lib/products-server";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  const products = await fetchProductsWithInventory();
  return <StoreClient products={products} />;
}
