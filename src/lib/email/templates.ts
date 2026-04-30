// src/lib/email/templates.ts
// MUGEN DISTRICT — Premium dark transactional email templates.
// Pure black, monospaced data, sharp borders. Renders in Gmail, Apple Mail, Outlook.

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

const WHATSAPP_SUPPORT_URL = "https://wa.me/2203340558";
const INSTAGRAM_URL = "https://instagram.com/mugendistrict";

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

function orderItemsText(items: EmailOrderItem[]) {
  return items
    .map((it) => {
      const size = (it.size || "M").toUpperCase();
      const sku = (it.sku || "").trim();
      const limitedNote = it.limited
        ? `\n  Limited archive piece confirmed${typeof it.remainingQty === "number" ? ` — ${it.remainingQty} left` : ""}`
        : "";
      return `- ${it.title}${sku ? ` [${sku}]` : ""} (Size ${size}) x${it.qty} — ${formatMoney(it.lineTotalCents, it.currency)}${limitedNote}`;
    })
    .join("\n");
}

// ─── Admin HTML ───────────────────────────────────────────────────────────────

function buildAdminItemRows(items: EmailOrderItem[]) {
  return items
    .map(
      (it) =>
        `<tr>
          <td style="padding:12px 0;border-top:1px solid rgba(255,255,255,0.08);">
            <p style="margin:0;color:#ffffff;font-size:14px;font-weight:600;">${esc(it.title)}</p>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.4);font-size:12px;font-family:'Courier New',Courier,monospace;">SKU: ${esc(it.sku?.trim() || "—")} &bull; Size: ${esc((it.size || "M").toUpperCase())} &bull; Qty: ${esc(it.qty)}</p>
          </td>
          <td align="right" style="padding:12px 0;border-top:1px solid rgba(255,255,255,0.08);">
            <p style="margin:0;color:#ffffff;font-size:14px;font-weight:600;">GMD ${esc(formatMajor(it.lineTotalCents))}</p>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.4);font-size:12px;">Unit: GMD ${esc(formatMajor(it.unitPriceCents))}</p>
          </td>
        </tr>`
    )
    .join("");
}

function buildAdminEmailHtml(payload: OrderEmailPayload): string {
  const orderDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const addressHtml = nonEmptyLines(payload.shippingAddress).length
    ? nonEmptyLines(payload.shippingAddress).map((l) => esc(l)).join("<br/>")
    : "—";

  const deliveryNote = (payload.deliveryNote || "").trim();
  const deliveryNoteBlock = deliveryNote
    ? `<p style="margin:12px 0 0;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">DELIVERY NOTE</p>
       <p style="margin:4px 0 0;color:rgba(255,255,255,0.6);font-size:13px;">${esc(deliveryNote)}</p>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>New Order</title>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <!-- Preheader -->
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">PREORDER: ${esc(payload.orderNumber)} &mdash; ${esc(safeName(payload.customerName))} &mdash; Ships end of week.</div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:32px;border-bottom:1px solid rgba(255,255,255,0.15);">
              <p style="margin:0;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">MUGEN DISTRICT</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.02em;line-height:1.1;">NEW ORDER<br>ARCHIVE ENTRY</h1>
            </td>
          </tr>

          <!-- Preorder flag -->
          <tr>
            <td style="padding:24px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border:1px solid rgba(192,57,43,0.6);padding:16px;">
                    <p style="margin:0;color:#c0392b;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;font-weight:700;">&#9888; PREORDER &mdash; SHIPS END OF WEEK</p>
                    <p style="margin:8px 0 0;color:rgba(255,255,255,0.6);font-size:13px;">Contact customer to confirm shipping before dispatch.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Order ref -->
          <tr>
            <td style="padding:24px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
              <p style="margin:0;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">ORDER REFERENCE</p>
              <p style="margin:8px 0 0;color:#ffffff;font-size:20px;font-family:'Courier New',Courier,monospace;font-weight:700;letter-spacing:0.05em;">${esc(payload.orderNumber)}</p>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.4);font-size:12px;font-family:'Courier New',Courier,monospace;">${esc(orderDate)}</p>
            </td>
          </tr>

          <!-- Customer -->
          <tr>
            <td style="padding:24px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
              <p style="margin:0 0 12px;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">CUSTOMER</p>
              <p style="margin:0;color:#ffffff;font-size:15px;font-weight:600;">${esc(safeName(payload.customerName))}</p>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.6);font-size:13px;">${esc(payload.customerEmail || "—")}</p>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.6);font-size:13px;">${esc(payload.customerPhone || "—")}</p>
            </td>
          </tr>

          <!-- Shipping -->
          <tr>
            <td style="padding:24px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
              <p style="margin:0 0 12px;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">SHIPPING ADDRESS</p>
              <p style="margin:0;color:#ffffff;font-size:14px;line-height:1.6;">${addressHtml}</p>
              ${deliveryNoteBlock}
            </td>
          </tr>

          <!-- Items -->
          <tr>
            <td style="padding:24px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:12px;">
                    <p style="margin:0;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">ARCHIVE ITEMS</p>
                  </td>
                  <td align="right" style="padding-bottom:12px;">
                    <p style="margin:0;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">TOTAL</p>
                  </td>
                </tr>
                ${buildAdminItemRows(payload.items)}
              </table>
            </td>
          </tr>

          <!-- Grand total -->
          <tr>
            <td style="padding:24px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td><p style="margin:0;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">GRAND TOTAL</p></td>
                  <td align="right"><p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;font-family:'Courier New',Courier,monospace;">GMD ${esc(formatMajor(payload.totalCents))}</p></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:32px;">
              <p style="margin:0;color:rgba(255,255,255,0.3);font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">MUGEN DISTRICT &mdash; ARCHIVE DROP SYSTEM</p>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.2);font-size:11px;">Manual payment required. Contact customer via WhatsApp to finalize.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Customer HTML ────────────────────────────────────────────────────────────

function buildCustomerItemRows(items: EmailOrderItem[]) {
  return items
    .map(
      (it) =>
        `<tr>
          <td style="padding:12px 0;border-top:1px solid rgba(255,255,255,0.08);">
            <p style="margin:0;color:#ffffff;font-size:14px;font-weight:600;">${esc(it.title)}</p>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.4);font-size:12px;font-family:'Courier New',Courier,monospace;">Size: ${esc((it.size || "M").toUpperCase())} &bull; Qty: ${esc(it.qty)}</p>
            ${it.limited ? `<p style="margin:4px 0 0;color:rgba(255,255,255,0.4);font-size:12px;">Limited archive piece${typeof it.remainingQty === "number" ? ` &mdash; ${esc(it.remainingQty)} remaining` : ""}</p>` : ""}
          </td>
          <td align="right" style="padding:12px 0;border-top:1px solid rgba(255,255,255,0.08);">
            <p style="margin:0;color:#ffffff;font-size:14px;font-weight:600;">GMD ${esc(formatMajor(it.lineTotalCents))}</p>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.4);font-size:12px;">Unit: GMD ${esc(formatMajor(it.unitPriceCents))}</p>
          </td>
        </tr>`
    )
    .join("");
}

function buildCustomerEmailHtml(payload: OrderEmailPayload): string {
  const addressOneLine = joinAddressOneLine(payload.shippingAddress);
  const deliveryNote = (payload.deliveryNote || "").trim();
  const deliveryNoteBlock = deliveryNote
    ? `<p style="margin:12px 0 0;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">DELIVERY NOTE</p>
       <p style="margin:4px 0 0;color:rgba(255,255,255,0.6);font-size:13px;">${esc(deliveryNote)}</p>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>Pre-Order Confirmed</title>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <!-- Preheader -->
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Pre-order confirmed: ${esc(payload.orderNumber)}. Ships end of week &mdash; we'll confirm via WhatsApp before it goes out.</div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:32px;border-bottom:1px solid rgba(255,255,255,0.15);">
              <p style="margin:0;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">MUGEN DISTRICT</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.02em;line-height:1.1;">YOUR PRE-ORDER<br>IS CONFIRMED.</h1>
            </td>
          </tr>

          <!-- Order ref -->
          <tr>
            <td style="padding:24px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
              <p style="margin:0;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">ORDER REFERENCE</p>
              <p style="margin:8px 0 0;color:#ffffff;font-size:20px;font-family:'Courier New',Courier,monospace;font-weight:700;letter-spacing:0.05em;">${esc(payload.orderNumber)}</p>
            </td>
          </tr>

          <!-- Shipping -->
          <tr>
            <td style="padding:24px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
              <p style="margin:0 0 12px;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">SHIPPING TO</p>
              <p style="margin:0;color:#ffffff;font-size:15px;font-weight:600;">${esc(safeName(payload.customerName))}</p>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.6);font-size:13px;">${esc(addressOneLine || "—")}</p>
              ${payload.customerPhone ? `<p style="margin:4px 0 0;color:rgba(255,255,255,0.4);font-size:13px;">${esc(payload.customerPhone)}</p>` : ""}
              ${deliveryNoteBlock}
            </td>
          </tr>

          <!-- Items -->
          <tr>
            <td style="padding:24px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:12px;">
                    <p style="margin:0;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">ARCHIVE ITEMS</p>
                  </td>
                  <td align="right" style="padding-bottom:12px;">
                    <p style="margin:0;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">TOTAL</p>
                  </td>
                </tr>
                ${buildCustomerItemRows(payload.items)}
              </table>
            </td>
          </tr>

          <!-- Grand total -->
          <tr>
            <td style="padding:24px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td><p style="margin:0;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">GRAND TOTAL</p></td>
                  <td align="right"><p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;font-family:'Courier New',Courier,monospace;">GMD ${esc(formatMajor(payload.totalCents))}</p></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Shipping status + CTA -->
          <tr>
            <td style="padding:24px 0;border-bottom:1px solid rgba(255,255,255,0.15);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border:1px solid rgba(255,255,255,0.12);padding:20px;">
                    <p style="margin:0;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">WHAT HAPPENS NEXT</p>
                    <p style="margin:12px 0 0;color:#ffffff;font-size:14px;line-height:1.7;">Your order ships end of week. We&rsquo;ll confirm via WhatsApp before it goes out.</p>
                    <p style="margin:10px 0 0;color:rgba(255,255,255,0.5);font-size:13px;line-height:1.6;">Limited archive piece secured. No restocks once this run is gone.</p>
                    <div style="margin-top:18px;">
                      <a href="${WHATSAPP_SUPPORT_URL}" style="display:inline-block;padding:11px 20px;background:#ffffff;color:#000000;font-size:12px;font-weight:700;letter-spacing:0.12em;text-decoration:none;text-transform:uppercase;">WHATSAPP US</a>
                      <a href="${INSTAGRAM_URL}" style="display:inline-block;margin-left:10px;padding:11px 16px;border:1px solid rgba(255,255,255,0.15);color:#ffffff;font-size:12px;font-weight:600;letter-spacing:0.08em;text-decoration:none;text-transform:uppercase;">FOLLOW ARCHIVE</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:32px;">
              <p style="margin:0;color:rgba(255,255,255,0.3);font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">MUGEN DISTRICT</p>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.2);font-size:11px;">Unlimited territory. West African grit. Neo-Tokyo energy. Established 2026.</p>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.2);font-size:11px;">If you didn&rsquo;t place this order, reply to this email immediately.</p>
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
  const subject = `Your Mugen District Pre-Order is Confirmed`;
  const text = [
    "MUGEN DISTRICT",
    "",
    "YOUR PRE-ORDER IS CONFIRMED.",
    "",
    `Order Ref: ${payload.orderNumber}`,
    "",
    "Your order ships end of week. We'll confirm via WhatsApp before it goes out.",
    "Limited archive piece secured. No restocks once this run is gone.",
    "",
    "Items:",
    orderItemsText(payload.items),
    "",
    `Total: ${formatMoney(payload.totalCents, payload.currency)}`,
    "",
    "Shipping:",
    safeName(payload.customerName),
    joinAddressOneLine(payload.shippingAddress) || "—",
    payload.customerPhone ? `Phone: ${payload.customerPhone}` : "",
    payload.deliveryNote ? `Note: ${payload.deliveryNote}` : "",
    "",
    "What Happens Next:",
    "1. Your order ships end of week.",
    "2. We'll WhatsApp you before it goes out to confirm details.",
    `3. WhatsApp: ${WHATSAPP_SUPPORT_URL}`,
    "",
    "— MUGEN DISTRICT",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html: buildCustomerEmailHtml(payload), text };
}

export function adminOrderEmail(payload: OrderEmailPayload): EmailTemplate {
  const subject = `⚠️ PREORDER — ${payload.orderNumber} — ${safeName(payload.customerName)}`;
  const text = [
    "MUGEN DISTRICT — ADMIN",
    "",
    "⚠️ PREORDER — Ships end of week",
    "",
    `NEW ORDER: ${payload.orderNumber}`,
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
    `Total: ${formatMoney(payload.totalCents, payload.currency)}`,
    "",
    "Ops Note: PREORDER — ships end of week. WhatsApp customer before dispatch to confirm.",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html: buildAdminEmailHtml(payload), text };
}
