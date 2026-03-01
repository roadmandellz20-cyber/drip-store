"use client";

import { useEffect, useMemo, useState } from "react";
import { mergeProductInventory, type Product } from "@/lib/products";

type ProductsResponse = {
  products?: Product[];
};

export function useLiveProducts(baseProducts: Product[]) {
  const [liveProducts, setLiveProducts] = useState<Product[]>([]);

  const slugs = useMemo(
    () =>
      Array.from(new Set(baseProducts.map((product) => product.sku.trim().toLowerCase()).filter(Boolean))).sort(),
    [baseProducts]
  );
  const slugsKey = slugs.join(",");

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function load() {
      if (!slugsKey) {
        setLiveProducts([]);
        return;
      }

      try {
        const response = await fetch(`/api/products?slugs=${encodeURIComponent(slugsKey)}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) return;

        const data = (await response.json()) as ProductsResponse;
        if (!ignore && Array.isArray(data.products)) {
          setLiveProducts(data.products);
        }
      } catch {
        if (!ignore) {
          setLiveProducts([]);
        }
      }
    }

    void load();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [slugsKey]);

  return useMemo(() => mergeProductInventory(baseProducts, liveProducts), [baseProducts, liveProducts]);
}
