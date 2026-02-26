const BRAND_LINE = "ENTER THE MUGEN.";

function esc(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export type EmailOrderItem = {
  title: string;
  qty: number;
  unitPriceCents: number;
  lineTotalCents: number;
  currency: string;
  size?: string;
};

export type EmailOrderPayload = {
  orderNumber: string;
  currency: string;
  totalCents: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  deliveryNote?: string;
  items: EmailOrderItem[];
};

function formatAmount(cents: number, currency: string) {
  return `${currency.toUpperCase()} ${Math.round(cents / 100).toLocaleString()}`;
}

function renderItems(items: EmailOrderItem[]) {
  return items
    .map((item) => {
      const sizeLine = item.size ? ` (Size: ${esc(item.size)})` : "";
      return `<li><strong>${esc(item.title)}</strong>${sizeLine} x ${item.qty} - ${formatAmount(item.lineTotalCents, item.currency)}</li>`;
    })
    .join("");
}

export function customerOrderEmail(payload: EmailOrderPayload) {
  const subject = `Order Received - ${payload.orderNumber}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
      <h2>Order Confirmation</h2>
      <p>Hi ${esc(payload.customerName)}, your order has been received.</p>
      <p><strong>Order Number:</strong> ${esc(payload.orderNumber)}</p>
      <p><strong>Total:</strong> ${formatAmount(payload.totalCents, payload.currency)}</p>
      <p><strong>Shipping Address:</strong><br/>${esc(payload.shippingAddress).replaceAll("\n", "<br/>")}</p>
      <h3>Items</h3>
      <ul>${renderItems(payload.items)}</ul>
      <p style="margin-top:20px;font-weight:700">${BRAND_LINE}</p>
    </div>
  `;
  const text = [
    `Order Confirmation`,
    `Order Number: ${payload.orderNumber}`,
    `Total: ${formatAmount(payload.totalCents, payload.currency)}`,
    `Shipping Address:\n${payload.shippingAddress}`,
    `Items:`,
    ...payload.items.map(
      (item) =>
        `- ${item.title}${item.size ? ` (Size: ${item.size})` : ""} x ${item.qty} = ${formatAmount(item.lineTotalCents, item.currency)}`
    ),
    BRAND_LINE,
  ].join("\n");

  return { subject, html, text };
}

export function adminOrderEmail(payload: EmailOrderPayload) {
  const subject = `New Order - ${payload.orderNumber}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
      <h2>New Order Alert</h2>
      <p><strong>Order Number:</strong> ${esc(payload.orderNumber)}</p>
      <p><strong>Customer:</strong> ${esc(payload.customerName)}</p>
      <p><strong>Email:</strong> ${esc(payload.customerEmail)}</p>
      <p><strong>Phone:</strong> ${esc(payload.customerPhone)}</p>
      <p><strong>Shipping Address:</strong><br/>${esc(payload.shippingAddress).replaceAll("\n", "<br/>")}</p>
      ${payload.deliveryNote ? `<p><strong>Delivery Note:</strong> ${esc(payload.deliveryNote)}</p>` : ""}
      <p><strong>Total:</strong> ${formatAmount(payload.totalCents, payload.currency)}</p>
      <h3>Full Order Breakdown</h3>
      <ul>${renderItems(payload.items)}</ul>
    </div>
  `;

  const text = [
    `New Order Alert`,
    `Order Number: ${payload.orderNumber}`,
    `Customer: ${payload.customerName}`,
    `Email: ${payload.customerEmail}`,
    `Phone: ${payload.customerPhone}`,
    `Shipping Address:\n${payload.shippingAddress}`,
    payload.deliveryNote ? `Delivery Note: ${payload.deliveryNote}` : "",
    `Total: ${formatAmount(payload.totalCents, payload.currency)}`,
    `Items:`,
    ...payload.items.map(
      (item) =>
        `- ${item.title}${item.size ? ` (Size: ${item.size})` : ""} x ${item.qty} = ${formatAmount(item.lineTotalCents, item.currency)}`
    ),
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
