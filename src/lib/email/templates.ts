// src/lib/email/templates.ts
// MUGEN DISTRICT — Premium dark transactional email templates.

export type EmailOrderItem = {
  title: string;
  sku?: string;
  qty: number;
  unitPriceCents: number;
  lineTotalCents: number;
  currency: string;
  size?: string;
  limited?: boolean;
  remainingQty?: number | null;
  imageUrl?: string;
};

export type OrderEmailPayload = {
  orderNumber: string;
  currency: string;
  totalCents: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  deliveryNote?: string;
  items: EmailOrderItem[];
};

type EmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function esc(input: unknown) {
  const s = typeof input === "string" ? input : String(input ?? "");
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMajor(cents: number) {
  const safe = Number.isFinite(cents) ? Math.round(cents) : 0;
  return (safe / 100).toFixed(2);
}

function formatMoney(cents: number, currency: string) {
  return `${currency.toUpperCase()} ${formatMajor(cents)}`;
}

function nonEmptyLines(value?: string) {
  const s = (value || "").trim();
  if (!s) return [];
  return s.split("\n").map((l) => l.trim()).filter(Boolean);
}

function joinAddressOneLine(address?: string) {
  return nonEmptyLines(address).join(", ");
}

function safeName(name?: string) {
  return (name || "").trim() || "Customer";
}

function orderDate() {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function orderItemsText(items: EmailOrderItem[]) {
  return items
    .map((it) => {
      const size = (it.size || "M").toUpperCase();
      const sku = (it.sku || "").trim();
      return `- ${it.title}${sku ? ` [${sku}]` : ""} (Size ${size}) x${it.qty} — ${formatMoney(it.lineTotalCents, it.currency)}`;
    })
    .join("\n");
}

// ─── Customer item rows ───────────────────────────────────────────────────────

function buildCustomerItemRows(items: EmailOrderItem[]) {
  return items
    .map(
      (it) =>
        `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
  <tr>
    <td style="padding:16px 0;border-top:1px solid rgba(255,255,255,0.08);">
      <p style="margin:0 0 4px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;">${esc(it.title)}</p>
      <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:11px;color:rgba(255,255,255,0.35);">SKU: ${esc(it.sku?.trim() || "—")} &nbsp;&bull;&nbsp; SIZE: ${esc((it.size || "M").toUpperCase())} &nbsp;&bull;&nbsp; QTY: ${esc(it.qty)}</p>
    </td>
    <td align="right" style="padding:16px 0;border-top:1px solid rgba(255,255,255,0.08);vertical-align:top;">
      <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:14px;font-weight:700;color:#ffffff;">GMD ${esc(formatMajor(it.lineTotalCents))}</p>
    </td>
  </tr>
</table>`
    )
    .join("");
}

// ─── Admin item rows ──────────────────────────────────────────────────────────

function buildAdminItemRows(items: EmailOrderItem[]) {
  return items
    .map(
      (it) =>
        `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
  <tr>
    <td style="padding:16px 0;border-top:1px solid rgba(255,255,255,0.08);">
      <p style="margin:0 0 4px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;">${esc(it.title)}</p>
      <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:11px;color:rgba(255,255,255,0.35);">SKU: ${esc(it.sku?.trim() || "—")} &nbsp;&bull;&nbsp; SIZE: ${esc((it.size || "M").toUpperCase())} &nbsp;&bull;&nbsp; QTY: ${esc(it.qty)}</p>
    </td>
    <td align="right" style="padding:16px 0;border-top:1px solid rgba(255,255,255,0.08);vertical-align:top;">
      <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:14px;font-weight:700;color:#ffffff;">GMD ${esc(formatMajor(it.lineTotalCents))}</p>
      <p style="margin:4px 0 0;font-family:'Courier New',Courier,monospace;font-size:11px;color:rgba(255,255,255,0.35);">Unit: GMD ${esc(formatMajor(it.unitPriceCents))}</p>
    </td>
  </tr>
</table>`
    )
    .join("");
}

// ─── Customer HTML ────────────────────────────────────────────────────────────

function buildCustomerEmailHtml(payload: OrderEmailPayload): string {
  const addressLines = nonEmptyLines(payload.shippingAddress);
  const addressHtml = addressLines.length
    ? addressLines.map((l) => esc(l)).join("<br>")
    : "—";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmed</title>
</head>
<body style="margin:0;padding:0;background:#000000;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#000000;">
  <tr>
    <td align="center" style="padding:48px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

        <!-- Brand -->
        <tr>
          <td style="padding-bottom:48px;">
            <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.35);text-transform:uppercase;">MUGEN DISTRICT &#28961;&#38480;</p>
          </td>
        </tr>

        <!-- Hero -->
        <tr>
          <td style="padding-bottom:48px;border-bottom:1px solid rgba(255,255,255,0.1);">
            <h1 style="margin:0 0 12px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:36px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;line-height:1;text-transform:uppercase;">PRE-ORDER<br>CONFIRMED.</h1>
            <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.45);line-height:1.6;">Your archive piece is locked in. Ships end of week.</p>
          </td>
        </tr>

        <!-- Order ref -->
        <tr>
          <td style="padding:32px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
            <p style="margin:0 0 8px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.3);text-transform:uppercase;">Order Reference</p>
            <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.05em;">${esc(payload.orderNumber)}</p>
            <p style="margin:6px 0 0;font-family:'Courier New',Courier,monospace;font-size:11px;color:rgba(255,255,255,0.3);">${esc(orderDate())}</p>
          </td>
        </tr>

        <!-- Items -->
        <tr>
          <td style="padding:32px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
            <p style="margin:0 0 20px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.3);text-transform:uppercase;">Archive Items</p>
            ${buildCustomerItemRows(payload.items)}
          </td>
        </tr>

        <!-- Total -->
        <tr>
          <td style="padding:32px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.3);text-transform:uppercase;">Total</p>
                </td>
                <td align="right">
                  <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:700;color:#ffffff;">GMD ${esc(formatMajor(payload.totalCents))}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- What happens next -->
        <tr>
          <td style="padding:32px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
            <p style="margin:0 0 8px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.3);text-transform:uppercase;">What Happens Next</p>
            <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.6);line-height:1.7;">Your order ships end of week. We will confirm via WhatsApp before it goes out. No restocks once this run is gone &mdash; your piece is secured.</p>
            <table cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
              <tr>
                <td style="background:#ffffff;padding:12px 24px;">
                  <a href="https://wa.me/2203340558" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.15em;color:#000000;text-decoration:none;text-transform:uppercase;">WhatsApp Support &rarr;</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Shipping address -->
        <tr>
          <td style="padding:32px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
            <p style="margin:0 0 12px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.3);text-transform:uppercase;">Shipping To</p>
            <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.6);line-height:1.7;">${esc(safeName(payload.customerName))}<br>${addressHtml}</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding-top:48px;">
            <p style="margin:0 0 4px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.2);text-transform:uppercase;">MUGEN DISTRICT</p>
            <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;color:rgba(255,255,255,0.15);">Limited archive release. No mass restocks. Enter the Mugen.</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ─── Admin HTML ───────────────────────────────────────────────────────────────

function buildAdminEmailHtml(payload: OrderEmailPayload): string {
  const addressLines = nonEmptyLines(payload.shippingAddress);
  const addressHtml = addressLines.length
    ? addressLines.map((l) => esc(l)).join("<br>")
    : "—";

  const deliveryNote = (payload.deliveryNote || "").trim();
  const deliveryNoteBlock = deliveryNote
    ? `<p style="margin:12px 0 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.15em;color:rgba(255,255,255,0.3);text-transform:uppercase;">Delivery Note</p>
<p style="margin:4px 0 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.5);">${esc(deliveryNote)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Order</title>
</head>
<body style="margin:0;padding:0;background:#000000;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#000000;">
  <tr>
    <td align="center" style="padding:48px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

        <!-- Brand -->
        <tr>
          <td style="padding-bottom:48px;">
            <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.35);text-transform:uppercase;">MUGEN DISTRICT &#28961;&#38480;</p>
          </td>
        </tr>

        <!-- Hero -->
        <tr>
          <td style="padding-bottom:32px;border-bottom:1px solid rgba(255,255,255,0.1);">
            <h1 style="margin:0 0 12px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:36px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;line-height:1;text-transform:uppercase;">NEW ORDER<br>ARCHIVE ENTRY.</h1>
          </td>
        </tr>

        <!-- Preorder flag -->
        <tr>
          <td style="padding:24px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-left:3px solid #c0392b;padding-left:16px;">
                  <p style="margin:0 0 4px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:#c0392b;text-transform:uppercase;">&#9888; Preorder &mdash; Ships End of Week</p>
                  <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.45);">Contact customer via WhatsApp to confirm before dispatch.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Order ref -->
        <tr>
          <td style="padding:32px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
            <p style="margin:0 0 8px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.3);text-transform:uppercase;">Order Reference</p>
            <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.05em;">${esc(payload.orderNumber)}</p>
            <p style="margin:6px 0 0;font-family:'Courier New',Courier,monospace;font-size:11px;color:rgba(255,255,255,0.3);">${esc(orderDate())}</p>
          </td>
        </tr>

        <!-- Customer -->
        <tr>
          <td style="padding:32px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
            <p style="margin:0 0 12px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.3);text-transform:uppercase;">Customer</p>
            <p style="margin:0 0 2px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;">${esc(safeName(payload.customerName))}</p>
            <p style="margin:0 0 2px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.5);">${esc(payload.customerEmail || "—")}</p>
            <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.5);">${esc(payload.customerPhone || "—")}</p>
          </td>
        </tr>

        <!-- Shipping -->
        <tr>
          <td style="padding:32px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
            <p style="margin:0 0 12px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.3);text-transform:uppercase;">Shipping Address</p>
            <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.6);line-height:1.7;">${addressHtml}</p>
            ${deliveryNoteBlock}
          </td>
        </tr>

        <!-- Items -->
        <tr>
          <td style="padding:32px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
            <p style="margin:0 0 20px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.3);text-transform:uppercase;">Archive Items</p>
            ${buildAdminItemRows(payload.items)}
          </td>
        </tr>

        <!-- Total -->
        <tr>
          <td style="padding:32px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.3);text-transform:uppercase;">Grand Total</p>
                </td>
                <td align="right">
                  <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:700;color:#ffffff;">GMD ${esc(formatMajor(payload.totalCents))}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding-top:48px;">
            <p style="margin:0 0 4px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.2);text-transform:uppercase;">MUGEN DISTRICT &mdash; ARCHIVE DROP SYSTEM</p>
            <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;color:rgba(255,255,255,0.15);">Manual payment required. Confirm via WhatsApp before dispatch.</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export function customerOrderEmail(payload: OrderEmailPayload): EmailTemplate {
  const subject = `PRE-ORDER CONFIRMED — ${payload.orderNumber}`;
  const text = [
    "MUGEN DISTRICT",
    "",
    "PRE-ORDER CONFIRMED.",
    "Your archive piece is locked in. Ships end of week.",
    "",
    `Order Ref: ${payload.orderNumber}`,
    `Date: ${orderDate()}`,
    "",
    "Items:",
    orderItemsText(payload.items),
    "",
    `Total: ${formatMoney(payload.totalCents, payload.currency)}`,
    "",
    "What Happens Next:",
    "Your order ships end of week. We'll confirm via WhatsApp before it goes out.",
    "No restocks once this run is gone — your piece is secured.",
    "WhatsApp: https://wa.me/2203340558",
    "",
    "Shipping To:",
    safeName(payload.customerName),
    joinAddressOneLine(payload.shippingAddress) || "—",
    payload.customerPhone ? `Phone: ${payload.customerPhone}` : "",
    payload.deliveryNote ? `Note: ${payload.deliveryNote}` : "",
    "",
    "— MUGEN DISTRICT",
    "Limited archive release. No mass restocks. Enter the Mugen.",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html: buildCustomerEmailHtml(payload), text };
}

export function adminOrderEmail(payload: OrderEmailPayload): EmailTemplate {
  const subject = `⚠ PREORDER ${payload.orderNumber} — ${safeName(payload.customerName)}`;
  const text = [
    "MUGEN DISTRICT — ADMIN",
    "",
    "⚠ PREORDER — Ships End of Week",
    "Contact customer via WhatsApp to confirm before dispatch.",
    "",
    `NEW ORDER: ${payload.orderNumber}`,
    `Date: ${orderDate()}`,
    "",
    "Customer:",
    safeName(payload.customerName),
    payload.customerEmail ? `Email: ${payload.customerEmail}` : "Email: —",
    payload.customerPhone ? `Phone: ${payload.customerPhone}` : "Phone: —",
    "",
    "Shipping Address:",
    ...(nonEmptyLines(payload.shippingAddress).length
      ? nonEmptyLines(payload.shippingAddress)
      : ["—"]),
    "",
    payload.deliveryNote ? `Delivery Note: ${payload.deliveryNote}` : "",
    "",
    "Items:",
    orderItemsText(payload.items),
    "",
    `Grand Total: ${formatMoney(payload.totalCents, payload.currency)}`,
    "",
    "Manual payment required. Confirm via WhatsApp before dispatch.",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html: buildAdminEmailHtml(payload), text };
}
