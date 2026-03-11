export type OrderSuccessSummary = {
  orderId: string;
  orderRef: string;
  currency: string;
  total: number;
  itemCount: number;
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
  itemCount: number;
}): OrderSuccessSummary {
  return {
    orderId: params.orderId,
    orderRef: params.orderRef,
    currency: params.currency,
    total: params.total,
    itemCount: Math.max(0, Math.floor(params.itemCount)),
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

    const summary: OrderSuccessSummary = {
      orderId: asString(parsed.orderId),
      orderRef: asString(parsed.orderRef),
      currency: asString(parsed.currency) || "GMD",
      total: asNumber(parsed.total),
      itemCount: Math.max(0, Math.floor(asNumber(parsed.itemCount))),
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
