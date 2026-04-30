// src/lib/email/templates.ts
// MUGEN DISTRICT — Premium dark image-led transactional email templates.

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

const SUPABASE_STORAGE =
  "https://qyhrjxhuyjbhotpkhzgj.supabase.co/storage/v1/object/public/SHIRTS";

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

function todayString() {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function heroImageUrl(items: EmailOrderItem[]): string {
  const sku = items[0]?.sku?.trim();
  if (!sku) return "";
  return `${SUPABASE_STORAGE}/${sku}.JPG`;
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

// ─── Item rows ────────────────────────────────────────────────────────────────

function buildCustomerItemRows(items: EmailOrderItem[]) {
  return items
    .map(
      (it) =>
        `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:0;">
  <tr>
    <td style="padding:16px 0;border-top:1px solid rgba(255,255,255,0.07);">
      <p style="margin:0 0 5px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;">${esc(it.title)}</p>
      <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:11px;color:rgba(255,255,255,0.3);letter-spacing:0.05em;">SKU: ${esc(it.sku?.trim() || "—")} &nbsp;&bull;&nbsp; SIZE: ${esc((it.size || "M").toUpperCase())} &nbsp;&bull;&nbsp; QTY: ${esc(it.qty)}</p>
    </td>
    <td align="right" style="padding:16px 0;border-top:1px solid rgba(255,255,255,0.07);vertical-align:top;">
      <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:15px;font-weight:700;color:#ffffff;">GMD ${esc(formatMajor(it.lineTotalCents))}</p>
    </td>
  </tr>
</table>`
    )
    .join("");
}

function buildAdminItemRows(items: EmailOrderItem[]) {
  return items
    .map(
      (it) =>
        `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:0;">
  <tr>
    <td style="padding:16px 0;border-top:1px solid rgba(255,255,255,0.07);">
      <p style="margin:0 0 5px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;">${esc(it.title)}</p>
      <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:11px;color:rgba(255,255,255,0.3);letter-spacing:0.05em;">SKU: ${esc(it.sku?.trim() || "—")} &nbsp;&bull;&nbsp; SIZE: ${esc((it.size || "M").toUpperCase())} &nbsp;&bull;&nbsp; QTY: ${esc(it.qty)}</p>
    </td>
    <td align="right" style="padding:16px 0;border-top:1px solid rgba(255,255,255,0.07);vertical-align:top;">
      <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:15px;font-weight:700;color:#ffffff;">GMD ${esc(formatMajor(it.lineTotalCents))}</p>
      <p style="margin:4px 0 0;font-family:'Courier New',Courier,monospace;font-size:11px;color:rgba(255,255,255,0.3);">Unit: GMD ${esc(formatMajor(it.unitPriceCents))}</p>
    </td>
  </tr>
</table>`
    )
    .join("");
}

// ─── Customer HTML ────────────────────────────────────────────────────────────

function buildCustomerEmailHtml(payload: OrderEmailPayload): string {
  const imgUrl = heroImageUrl(payload.items);
  const heroImg = imgUrl
    ? `<img src="${imgUrl}" alt="${esc(payload.items[0]?.title ?? "Mugen District")}" width="100%" style="display:block;width:100%;max-height:500px;object-fit:cover;object-position:center top;" />`
    : "";

  const addressLines = nonEmptyLines(payload.shippingAddress);
  const addressHtml = addressLines.length
    ? addressLines.map((l) => esc(l)).join("<br>")
    : "—";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#000000;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#000000;">
<tr><td>

  ${heroImg}

  <table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td align="center" style="padding:48px 24px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

    <!-- Brand -->
    <tr><td style="padding-bottom:40px;">
      <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.25em;color:rgba(255,255,255,0.3);text-transform:uppercase;">MUGEN DISTRICT &#28961;&#38480;</p>
    </td></tr>

    <!-- Heading -->
    <tr><td style="padding-bottom:40px;border-bottom:1px solid rgba(255,255,255,0.1);">
      <h1 style="margin:0 0 16px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:40px;font-weight:800;color:#ffffff;letter-spacing:-0.03em;line-height:0.95;text-transform:uppercase;">PRE-ORDER<br>CONFIRMED.</h1>
      <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;color:rgba(255,255,255,0.4);line-height:1.6;">Your archive piece is locked in.<br>Ships end of week.</p>
    </td></tr>

    <!-- Order ref -->
    <tr><td style="padding:32px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td>
            <p style="margin:0 0 6px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.3);text-transform:uppercase;">Order Reference</p>
            <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:16px;font-weight:700;color:#ffffff;letter-spacing:0.08em;">${esc(payload.orderNumber)}</p>
          </td>
          <td align="right">
            <p style="margin:0 0 6px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.3);text-transform:uppercase;">Date</p>
            <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:13px;color:rgba(255,255,255,0.5);">${esc(todayString())}</p>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- Items -->
    <tr><td style="padding:32px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
      <p style="margin:0 0 20px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.3);text-transform:uppercase;">Archive Items</p>
      ${buildCustomerItemRows(payload.items)}
    </td></tr>

    <!-- Total -->
    <tr><td style="padding:32px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td><p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.3);text-transform:uppercase;">Total</p></td>
          <td align="right"><p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:700;color:#ffffff;">GMD ${esc(formatMajor(payload.totalCents))}</p></td>
        </tr>
      </table>
    </td></tr>

    <!-- Shipping to -->
    <tr><td style="padding:32px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
      <p style="margin:0 0 12px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.3);text-transform:uppercase;">Shipping To</p>
      <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;color:rgba(255,255,255,0.6);line-height:1.8;">${esc(safeName(payload.customerName))}<br>${addressHtml}</p>
    </td></tr>

    <!-- What happens next -->
    <tr><td style="padding:32px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
      <p style="margin:0 0 12px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.3);text-transform:uppercase;">What Happens Next</p>
      <p style="margin:0 0 24px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;color:rgba(255,255,255,0.55);line-height:1.7;">Your order ships end of week. We will confirm via WhatsApp before it goes out. No restocks once this run is gone &mdash; your piece is secured.</p>
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background:#ffffff;">
            <a href="https://wa.me/2203340558" style="display:block;padding:14px 28px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.15em;color:#000000;text-decoration:none;text-transform:uppercase;">WhatsApp Us &rarr;</a>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- Footer -->
    <tr><td style="padding-top:48px;">
      <p style="margin:0 0 6px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.15);text-transform:uppercase;">MUGEN DISTRICT</p>
      <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;color:rgba(255,255,255,0.15);line-height:1.6;">Limited archive release. No mass restocks.<br>Enter the Mugen.</p>
    </td></tr>

  </table>
  </td></tr>
  </table>

</td></tr>
</table>
</body>
</html>`;
}

// ─── Admin HTML ───────────────────────────────────────────────────────────────

function buildAdminEmailHtml(payload: OrderEmailPayload): string {
  const imgUrl = heroImageUrl(payload.items);
  const heroImg = imgUrl
    ? `<img src="${imgUrl}" alt="${esc(payload.items[0]?.title ?? "Mugen District")}" width="100%" style="display:block;width:100%;max-height:500px;object-fit:cover;object-position:center top;" />`
    : "";

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
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#000000;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#000000;">
<tr><td>

  ${heroImg}

  <table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td align="center" style="padding:48px 24px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

    <!-- Brand -->
    <tr><td style="padding-bottom:40px;">
      <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.25em;color:rgba(255,255,255,0.3);text-transform:uppercase;">MUGEN DISTRICT &#28961;&#38480;</p>
    </td></tr>

    <!-- Heading -->
    <tr><td style="padding-bottom:32px;border-bottom:1px solid rgba(255,255,255,0.1);">
      <h1 style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:40px;font-weight:800;color:#ffffff;letter-spacing:-0.03em;line-height:0.95;text-transform:uppercase;">NEW ORDER<br>ARCHIVE ENTRY.</h1>
    </td></tr>

    <!-- Preorder flag -->
    <tr><td style="padding:24px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="border-left:3px solid #c0392b;padding-left:16px;">
            <p style="margin:0 0 4px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:#c0392b;text-transform:uppercase;">&#9888; Preorder &mdash; Ships End of Week</p>
            <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.4);">Contact customer via WhatsApp before dispatch.</p>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- Order ref -->
    <tr><td style="padding:32px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td>
            <p style="margin:0 0 6px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.3);text-transform:uppercase;">Order Reference</p>
            <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:16px;font-weight:700;color:#ffffff;letter-spacing:0.08em;">${esc(payload.orderNumber)}</p>
          </td>
          <td align="right">
            <p style="margin:0 0 6px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.3);text-transform:uppercase;">Date</p>
            <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:13px;color:rgba(255,255,255,0.5);">${esc(todayString())}</p>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- Customer -->
    <tr><td style="padding:32px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
      <p style="margin:0 0 12px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.3);text-transform:uppercase;">Customer</p>
      <p style="margin:0 0 3px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;">${esc(safeName(payload.customerName))}</p>
      <p style="margin:0 0 3px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.5);">${esc(payload.customerEmail || "—")}</p>
      <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.5);">${esc(payload.customerPhone || "—")}</p>
    </td></tr>

    <!-- Shipping -->
    <tr><td style="padding:32px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
      <p style="margin:0 0 12px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.3);text-transform:uppercase;">Shipping Address</p>
      <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;color:rgba(255,255,255,0.6);line-height:1.8;">${addressHtml}</p>
      ${deliveryNoteBlock}
    </td></tr>

    <!-- Items -->
    <tr><td style="padding:32px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
      <p style="margin:0 0 20px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.3);text-transform:uppercase;">Archive Items</p>
      ${buildAdminItemRows(payload.items)}
    </td></tr>

    <!-- Total -->
    <tr><td style="padding:32px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td><p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.3);text-transform:uppercase;">Grand Total</p></td>
          <td align="right"><p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:700;color:#ffffff;">GMD ${esc(formatMajor(payload.totalCents))}</p></td>
        </tr>
      </table>
    </td></tr>

    <!-- Footer -->
    <tr><td style="padding-top:48px;">
      <p style="margin:0 0 6px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.2);text-transform:uppercase;">MUGEN DISTRICT &mdash; ARCHIVE DROP SYSTEM</p>
      <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;color:rgba(255,255,255,0.15);">Manual payment required. Confirm via WhatsApp before dispatch.</p>
    </td></tr>

  </table>
  </td></tr>
  </table>

</td></tr>
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
    `Date: ${todayString()}`,
    "",
    "Items:",
    orderItemsText(payload.items),
    "",
    `Total: ${formatMoney(payload.totalCents, payload.currency)}`,
    "",
    "Shipping To:",
    safeName(payload.customerName),
    joinAddressOneLine(payload.shippingAddress) || "—",
    payload.customerPhone ? `Phone: ${payload.customerPhone}` : "",
    payload.deliveryNote ? `Note: ${payload.deliveryNote}` : "",
    "",
    "What Happens Next:",
    "Your order ships end of week. We'll confirm via WhatsApp before it goes out.",
    "No restocks once this run is gone — your piece is secured.",
    "WhatsApp: https://wa.me/2203340558",
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
    "Contact customer via WhatsApp before dispatch.",
    "",
    `NEW ORDER: ${payload.orderNumber}`,
    `Date: ${todayString()}`,
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
