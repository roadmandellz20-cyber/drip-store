import { sanitizeIdInput, sanitizeSingleLineInput, sanitizeSlugInput } from "@/lib/input";
import type { Product } from "./products";
import { trackEvent } from "./analytics";
import { getProductBySku, isProductSoldOut, LIMITED_STOCK_QTY } from "./products";

export type CartItem = {
  id: string;
  qty: number;
  size: "S" | "M" | "L" | "XL";
  product: Pick<
    Product,
    | "id"
    | "name"
    | "price"
    | "imageUrl"
    | "imageFallbackUrl"
    | "sku"
    | "isLimited"
    | "stockQty"
    | "soldQty"
    | "available"
    | "soldOut"
  >;
};

export type AddToCartResult = {
  items: CartItem[];
  status: "added" | "limited_stock" | "sold_out";
};

const KEY = "mugen_cart_v1";

function emitCartUpdate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("mugen_cart_update"));
  window.dispatchEvent(new CustomEvent("mugen:cart"));
}

function emitToast(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("mugen_toast", { detail: message }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clampQty(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.floor(parsed));
}

function toCartProduct(product: Product): CartItem["product"] {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    imageUrl: product.imageUrl,
    imageFallbackUrl: product.imageFallbackUrl,
    sku: product.sku,
    isLimited: product.isLimited,
    stockQty: product.stockQty,
    soldQty: product.soldQty,
    available: product.available,
    soldOut: product.soldOut,
  };
}

export function cartItemToProductSnapshot(item: CartItem): Product {
  const sku = sanitizeSlugInput(item.product.sku, 64);
  const name = sanitizeSingleLineInput(item.product.name, { maxLength: 160 }) || sku || item.id;
  const id = sanitizeIdInput(item.product.id || item.id, 120) || sku || item.id;
  const isLimited = Boolean(item.product.isLimited);
  const stockQty =
    typeof item.product.stockQty === "number"
      ? item.product.stockQty
      : isLimited
        ? LIMITED_STOCK_QTY
        : null;
  const soldQty = typeof item.product.soldQty === "number" ? item.product.soldQty : 0;
  const available =
    typeof item.product.available === "number"
      ? item.product.available
      : isLimited && stockQty !== null
        ? Math.max(0, stockQty - soldQty)
        : null;

  return {
    id,
    sku: sku || id,
    name,
    price: item.product.price,
    imageUrl: item.product.imageUrl,
    imageFallbackUrl: item.product.imageFallbackUrl || item.product.imageUrl,
    lookImageUrl: null as unknown as string,
    lookImageFallbackUrl: null as unknown as string,
    limited: isLimited,
    isLimited,
    stockQty,
    soldQty,
    available,
    availableQty: available,
    soldOut: Boolean(item.product.soldOut),
    isNew: false,
    category: isLimited ? "limited" : "all",
    description: "",
    details: [],
    brandLine: "ENTER THE MUGEN.",
  };
}

function resolveCatalogProduct(item: Record<string, unknown>) {
  const product = item.product;
  if (!isRecord(product)) return null;

  const sku =
    sanitizeSlugInput(product.sku, 64) || sanitizeSlugInput(item.id, 64);

  return sku ? getProductBySku(sku) : null;
}

function normalizeCartItem(item: Record<string, unknown>): CartItem | null {
  const product = item.product;
  if (!isRecord(product)) return null;

  const catalogProduct = resolveCatalogProduct(item);

  const imageUrl =
    sanitizeSingleLineInput(catalogProduct?.imageUrl || product.imageUrl || product.image, {
      collapseWhitespace: false,
      maxLength: 2048,
    });
  const imageFallbackUrl =
    sanitizeSingleLineInput(catalogProduct?.imageFallbackUrl || product.imageFallbackUrl || imageUrl, {
      collapseWhitespace: false,
      maxLength: 2048,
    });
  const sku = catalogProduct?.sku || sanitizeSlugInput(product.sku, 64) || sanitizeSlugInput(item.id, 64);
  const id = catalogProduct?.id || sanitizeIdInput(item.id, 120) || sanitizeIdInput(product.id, 120) || "";
  const name = catalogProduct?.name || sanitizeSingleLineInput(product.name, { maxLength: 160 }) || "";
  const price =
    typeof product.price === "number" ? product.price : typeof catalogProduct?.price === "number" ? catalogProduct.price : null;
  const isLimited =
    typeof product.isLimited === "boolean"
      ? product.isLimited
      : catalogProduct?.isLimited || false;
  const stockQty =
    typeof product.stockQty === "number"
      ? product.stockQty
      : catalogProduct?.stockQty ?? (isLimited ? LIMITED_STOCK_QTY : null);
  const soldQty =
    typeof product.soldQty === "number" ? product.soldQty : catalogProduct?.soldQty || 0;
  const available =
    typeof product.available === "number"
      ? product.available
      : catalogProduct?.available ??
        (isLimited && stockQty !== null ? Math.max(0, stockQty - soldQty) : null);
  const soldOut =
    typeof product.soldOut === "boolean"
      ? product.soldOut
      : Boolean(isLimited && available !== null && available <= 0);

  if (
    !id ||
    !sku ||
    !imageUrl ||
    !name ||
    typeof price !== "number" ||
    (item.size !== "S" && item.size !== "M" && item.size !== "L" && item.size !== "XL")
  ) {
    return null;
  }

  return {
    id,
    qty: clampQty(item.qty),
    size: item.size,
    product: {
      id: catalogProduct?.id || sanitizeIdInput(product.id, 120) || id,
      name,
      price,
      imageUrl,
      imageFallbackUrl,
      sku,
      isLimited,
      stockQty,
      soldQty,
      available,
      soldOut,
    },
  };
}

function canAddMore(product: CartItem["product"], nextQty: number) {
  if (!product.isLimited) return true;
  if (isProductSoldOut(product as Product)) return false;
  if (product.available === null) return true;
  return nextQty <= product.available;
}

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => normalizeCartItem(item))
      .filter((item): item is CartItem => item !== null);
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  emitCartUpdate();
}

export function addToCart(
  product: Product,
  size: CartItem["size"] = "M",
  qty = 1
): AddToCartResult {
  const items = readCart();
  const existing = items.find((item) => item.id === product.id && item.size === size);
  const incomingQty = clampQty(qty);
  const cartProduct = toCartProduct(product);

  if (product.isLimited && isProductSoldOut(product)) {
    emitToast("Sold out");
    return { items, status: "sold_out" };
  }

  const nextQty = (existing?.qty || 0) + incomingQty;
  if (!canAddMore(cartProduct, nextQty)) {
    if (existing && product.available !== null && product.available > existing.qty) {
      existing.qty = product.available;
      existing.product = cartProduct;
      writeCart(items);
    }
    emitToast("Limited stock");
    return { items, status: "limited_stock" };
  }

  if (existing) {
    existing.qty = nextQty;
    existing.product = cartProduct;
  } else {
    items.push({
      id: product.id,
      qty: incomingQty,
      size,
      product: cartProduct,
    });
  }

  writeCart(items);
  trackEvent("add_to_cart", {
    id: product.id,
    sku: product.sku,
    size,
    qty: incomingQty,
    limited: product.isLimited,
    price: product.price,
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("mugen:cart:add", {
        detail: { id: product.id, size, qty: incomingQty },
      })
    );
  }
  return { items, status: "added" };
}

export function syncCartProducts(products: Product[], currentItems: CartItem[] = readCart()) {
  const byKey = new Map<string, Product>();

  products.forEach((product) => {
    byKey.set(product.id.toLowerCase(), product);
    byKey.set(product.sku.toLowerCase(), product);
  });

  let changed = false;
  const nextItems = currentItems.map((item) => {
    const product =
      byKey.get(item.id.toLowerCase()) || byKey.get(item.product.sku.toLowerCase());
    if (!product) return item;

    const nextProduct = toCartProduct(product);
    const sameProduct =
      item.product.id === nextProduct.id &&
      item.product.name === nextProduct.name &&
      item.product.price === nextProduct.price &&
      item.product.imageUrl === nextProduct.imageUrl &&
      item.product.imageFallbackUrl === nextProduct.imageFallbackUrl &&
      item.product.sku === nextProduct.sku &&
      item.product.isLimited === nextProduct.isLimited &&
      item.product.stockQty === nextProduct.stockQty &&
      item.product.soldQty === nextProduct.soldQty &&
      item.product.available === nextProduct.available &&
      item.product.soldOut === nextProduct.soldOut;

    if (sameProduct && item.id === product.id) {
      return item;
    }

    changed = true;
    return {
      ...item,
      id: product.id,
      product: nextProduct,
    };
  });

  return { items: changed ? nextItems : currentItems, changed };
}

export function persistSyncedCartProducts(
  products: Product[],
  currentItems: CartItem[] = readCart()
) {
  const result = syncCartProducts(products, currentItems);
  if (result.changed) {
    writeCart(result.items);
  }
  return result.items;
}

export function updateQty(productId: string, size: CartItem["size"], qty: number) {
  const items = readCart();
  const item = items.find((entry) => entry.id === productId && entry.size === size);
  if (!item) return items;

  const nextQty = clampQty(qty);
  if (!canAddMore(item.product, nextQty)) {
    emitToast(item.product.soldOut ? "Sold out" : "Limited stock");
    return items;
  }

  item.qty = nextQty;
  writeCart(items);
  return items;
}

export function incQty(productId: string, size: CartItem["size"]) {
  const items = readCart();
  const item = items.find((entry) => entry.id === productId && entry.size === size);
  if (!item) return items;

  const nextQty = item.qty + 1;
  if (!canAddMore(item.product, nextQty)) {
    emitToast(item.product.soldOut ? "Sold out" : "Limited stock");
    return items;
  }

  item.qty = nextQty;
  writeCart(items);
  return items;
}

export function decQty(productId: string, size: CartItem["size"]) {
  const items = readCart();
  const item = items.find((entry) => entry.id === productId && entry.size === size);
  if (!item) return items;
  item.qty = Math.max(1, item.qty - 1);
  writeCart(items);
  return items;
}

export function removeFromCart(productId: string, size: CartItem["size"]) {
  const items = readCart().filter((item) => !(item.id === productId && item.size === size));
  writeCart(items);
  return items;
}

export function clearCart() {
  writeCart([]);
  return [];
}

export function cartCount(items: CartItem[] = readCart()) {
  return items.reduce((sum, item) => sum + item.qty, 0);
}

export function cartTotal(items: CartItem[] = readCart()) {
  return items.reduce((sum, item) => sum + item.qty * item.product.price, 0);
}

export function getCartInventoryState(items: CartItem[]) {
  let hasLimitedMismatch = false;

  for (const item of items) {
    if (!item.product.isLimited) continue;
    const available = item.product.available;
    if (item.product.soldOut) return "sold_out" as const;
    if (available !== null && available <= 0) return "sold_out" as const;
    if (available !== null && item.qty > available) hasLimitedMismatch = true;
  }

  return hasLimitedMismatch ? ("limited_stock" as const) : ("ok" as const);
}
