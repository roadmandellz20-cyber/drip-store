export function formatMoney(cents: number, currency?: string) {
  const amount = cents / 100;
  return new Intl.NumberFormat("en-GM", {
    style: "currency",
    currency: currency || "GMD",
  }).format(amount);
}
