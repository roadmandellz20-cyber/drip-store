export type CartItem = {
  productId: string;
  slug: string;
  title: string;
  cover: string;
  priceCents: number;
  currency: string;
  size: string;
  qty: number;
};

const KEY = "drip_cart_v1";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function setCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function addToCart(item: CartItem) {
  const items = getCart();
  const idx = items.findIndex(
    (x) => x.productId === item.productId && x.size === item.size
  );
  if (idx >= 0) items[idx] = { ...items[idx], qty: items[idx].qty + item.qty };
  else items.push(item);
  setCart(items);
}

export function removeFromCart(productId: string, size: string) {
  setCart(getCart().filter((x) => !(x.productId === productId && x.size === size)));
}

export function updateQty(productId: string, size: string, qty: number) {
  const items = getCart().map((x) =>
    x.productId === productId && x.size === size ? { ...x, qty: Math.max(1, qty) } : x
  );
  setCart(items);
}

export function cartTotal(items: CartItem[]) {
  return items.reduce((sum, x) => sum + x.priceCents * x.qty, 0);
}