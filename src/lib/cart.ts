import type { Product } from "./products";

export type CartItem = {
  id: string;
  qty: number;
  size: "S" | "M" | "L" | "XL";
  product: Pick<Product, "id" | "name" | "price" | "imageUrl" | "imageFallbackUrl" | "sku">;
};

const KEY = "mugen_cart_v1";

function emitCartUpdate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("mugen_cart_update"));
  window.dispatchEvent(new CustomEvent("mugen:cart"));
}

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;

        const product =
          item.product && typeof item.product === "object"
            ? item.product
            : {};
        const imageUrl =
          typeof product.imageUrl === "string"
            ? product.imageUrl
            : typeof product.image === "string"
              ? product.image
              : "";
        const imageFallbackUrl =
          typeof product.imageFallbackUrl === "string"
            ? product.imageFallbackUrl
            : imageUrl;

        return {
          ...item,
          product: {
            ...product,
            imageUrl,
            imageFallbackUrl,
          },
        };
      })
      .filter(Boolean) as CartItem[];
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  emitCartUpdate();
}

export function addToCart(product: Product, size: CartItem["size"] = "M", qty = 1) {
  const items = readCart();
  const existing = items.find((i) => i.id === product.id && i.size === size);
  if (existing) existing.qty += qty;
  else {
    items.push({
      id: product.id,
      qty,
      size,
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        imageFallbackUrl: product.imageFallbackUrl,
        sku: product.sku,
      },
    });
  }
  writeCart(items);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("mugen:cart:add", {
        detail: { id: product.id, size, qty },
      })
    );
  }
  return items;
}

export function updateQty(productId: string, size: CartItem["size"], qty: number) {
  const items = readCart();
  const item = items.find((i) => i.id === productId && i.size === size);
  if (!item) return items;
  item.qty = Math.max(1, qty);
  writeCart(items);
  return items;
}

export function incQty(productId: string, size: CartItem["size"]) {
  const items = readCart();
  const item = items.find((i) => i.id === productId && i.size === size);
  if (!item) return items;
  item.qty += 1;
  writeCart(items);
  return items;
}

export function decQty(productId: string, size: CartItem["size"]) {
  const items = readCart();
  const item = items.find((i) => i.id === productId && i.size === size);
  if (!item) return items;
  item.qty = Math.max(1, item.qty - 1);
  writeCart(items);
  return items;
}

export function removeFromCart(productId: string, size: CartItem["size"]) {
  const items = readCart().filter((i) => !(i.id === productId && i.size === size));
  writeCart(items);
  return items;
}

export function clearCart() {
  writeCart([]);
  return [];
}

export function cartCount(items: CartItem[] = readCart()) {
  return items.reduce((sum, i) => sum + i.qty, 0);
}

export function cartTotal(items: CartItem[] = readCart()) {
  return items.reduce((sum, i) => sum + i.qty * i.product.price, 0);
}
