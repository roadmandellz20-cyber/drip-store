"use client";

export type AnalyticsEventName =
  | "view_product"
  | "add_to_cart"
  | "begin_checkout"
  | "order_submitted";

export type AnalyticsPayload = Record<string, unknown>;

export function trackEvent(event: AnalyticsEventName, payload: AnalyticsPayload = {}) {
  if (typeof window === "undefined") return;

  const detail = {
    event,
    payload,
    timestamp: Date.now(),
  };

  window.dispatchEvent(new CustomEvent("mugen:analytics", { detail }));
  console.log(`[analytics] ${event}`, payload);
}
