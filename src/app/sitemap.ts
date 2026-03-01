import type { MetadataRoute } from "next";
import { ALL_PRODUCTS } from "@/lib/products";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
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

  const productEntries = ALL_PRODUCTS.map((product) => ({
    url: absoluteUrl(`/product/${product.id}`),
    changeFrequency: "weekly" as const,
    priority: product.isLimited ? 0.9 : 0.8,
  }));

  return [...staticEntries, ...productEntries];
}
