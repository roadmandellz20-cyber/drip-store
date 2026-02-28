import type { CartItem } from "@/lib/cart";

export type OrderSuccessItem = {
  id: string;
  sku: string;
  name: string;
  qty: number;
  size: string;
  unitPrice: number;
  lineTotal: number;
};

export type OrderSuccessShipping = {
  name: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  deliveryNote: string;
};

export type OrderSuccessSummary = {
  orderId: string;
  orderRef: string;
  currency: string;
  total: number;
  shipping: OrderSuccessShipping;
  items: OrderSuccessItem[];
};

const KEY = "mugen_last_order_summary_v1";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function createOrderSuccessSummary(params: {
  orderId: string;
  orderRef: string;
  currency: string;
  total: number;
  shipping: OrderSuccessShipping;
  items: CartItem[];
}): OrderSuccessSummary {
  return {
    orderId: params.orderId,
    orderRef: params.orderRef,
    currency: params.currency,
    total: params.total,
    shipping: {
      name: params.shipping.name,
      email: params.shipping.email,
      phone: params.shipping.phone,
      address1: params.shipping.address1,
      address2: params.shipping.address2,
      city: params.shipping.city,
      region: params.shipping.region,
      postalCode: params.shipping.postalCode,
      country: params.shipping.country,
      deliveryNote: params.shipping.deliveryNote,
    },
    items: params.items.map((item) => ({
      id: item.id,
      sku: item.product.sku,
      name: item.product.name,
      qty: item.qty,
      size: item.size,
      unitPrice: item.product.price,
      lineTotal: item.product.price * item.qty,
    })),
  };
}

export function writeOrderSuccessSummary(summary: OrderSuccessSummary) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(summary));
}

export function readOrderSuccessSummaryRaw() {
  if (typeof window === "undefined") return "";

  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}

export function parseOrderSuccessSummary(raw: string) {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return null;

    const shipping = isRecord(parsed.shipping) ? parsed.shipping : {};
    const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
    const items = rawItems
      .filter(isRecord)
      .map((item) => ({
        id: asString(item.id),
        sku: asString(item.sku),
        name: asString(item.name),
        qty: asNumber(item.qty),
        size: asString(item.size),
        unitPrice: asNumber(item.unitPrice),
        lineTotal: asNumber(item.lineTotal),
      }))
      .filter((item) => item.id && item.name && item.qty > 0);

    const summary: OrderSuccessSummary = {
      orderId: asString(parsed.orderId),
      orderRef: asString(parsed.orderRef),
      currency: asString(parsed.currency) || "GMD",
      total: asNumber(parsed.total),
      shipping: {
        name: asString(shipping.name),
        email: asString(shipping.email),
        phone: asString(shipping.phone),
        address1: asString(shipping.address1),
        address2: asString(shipping.address2),
        city: asString(shipping.city),
        region: asString(shipping.region),
        postalCode: asString(shipping.postalCode),
        country: asString(shipping.country),
        deliveryNote: asString(shipping.deliveryNote),
      },
      items,
    };

    if (!summary.orderId || !summary.orderRef) return null;
    return summary;
  } catch {
    return null;
  }
}

export function readOrderSuccessSummary() {
  if (typeof window === "undefined") return null;
  return parseOrderSuccessSummary(readOrderSuccessSummaryRaw());
}
