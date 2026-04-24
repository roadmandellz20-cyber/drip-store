import type { MetadataRoute } from "next";
import { fetchProductsWithInventory } from "@/lib/products-server";
import { absoluteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = [
    "/archive",
    "/store",
    "/new",
    "/limited",
    "/about",
    "/cart",
    "/checkout",
  ];

  const staticEntries = staticPages.map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: "daily" as const,
    priority: path === "/archive" ? 1 : 0.7,
  }));

  const products = await fetchProductsWithInventory();
  const productEntries = products.map((product) => ({
    url: absoluteUrl(`/product/${product.sku}`),
    changeFrequency: "weekly" as const,
    priority: product.isLimited ? 0.9 : 0.8,
  }));

  return [...staticEntries, ...productEntries];
}
