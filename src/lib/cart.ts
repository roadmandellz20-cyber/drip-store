import type { Product } from "./products";

export type CartItem = {
  id: string;
  qty: number;
  size: "S" | "M" | "L" | "XL";
  product: Pick<Product, "id" | "name" | "price" | "image" | "sku">;
};

const KEY = "mugen_cart_v1";

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
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
        image: product.image,
        sku: product.sku,
      },
    });
  }
  writeCart(items);
  return items;
}

export function removeFromCart(productId: string, size: CartItem["size"]) {
  const items = readCart().filter((i) => !(i.id === productId && i.size === size));
  writeCart(items);
  return items;
}

export function cartTotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.qty * i.product.price, 0);
}
