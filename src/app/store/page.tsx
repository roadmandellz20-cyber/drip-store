import type { Metadata } from "next";
import StoreClient from "./StoreClient";
import { fetchProductsWithInventory } from "@/lib/products-server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "All Products",
  description: "Shop every Mugen District piece in one grid. Limited archive items, new drops, and no filler.",
  alternates: {
    canonical: "/store",
  },
};

export default async function StorePage() {
  const products = await fetchProductsWithInventory();
  return <StoreClient products={products} />;
}
