// src/lib/email/templates.ts
// MUGEN DISTRICT — Luxury transactional templates (dark, sharp, premium).
// Works with current manual order flow: customer + admin emails.

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
  // Optional: if you ever pass it in later, we'll use it (safe fallback).
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

function esc(input: unknown) {
  const s = typeof input === "string" ? input : String(input ?? "");
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(cents: number, currency: string) {
  const safe = Number.isFinite(cents) ? Math.round(cents) : 0;
  const major = (safe / 100).toFixed(2);
  return `${currency.toUpperCase()} ${major}`;
}

function nonEmptyLines(value?: string) {
  const s = (value || "").trim();
  if (!s) return [];
  return s.split("\n").map((l) => l.trim()).filter(Boolean);
}

function joinAddressOneLine(address?: string) {
  const lines = nonEmptyLines(address);
  return lines.join(", ");
}

function orderItemsText(items: EmailOrderItem[]) {
  return items
    .map((it) => {
      const size = (it.size || "M").toUpperCase();
      const sku = (it.sku || "").trim();
      const limitedNote = it.limited
        ? `\n  Limited Archive piece confirmed${typeof it.remainingQty === "number" ? ` — ${it.remainingQty} left` : ""}`
        : "";
      const skuText = sku ? ` [${sku}]` : "";
      return `- ${it.title}${skuText} (Size ${size}) x${it.qty} — ${formatMoney(
        it.lineTotalCents,
        it.currency
      )}${limitedNote}`;
    })
    .join("\n");
}

function safeName(name?: string) {
  const n = (name || "").trim();
  return n || "Customer";
}

/**
 * Premium dark email wrapper (inline CSS only for max compatibility).
 * No external fonts, no background images (deliverability-safe).
 */
function wrapHtml(params: {
  preheader: string;
  headlineTop: string;
  headlineBottom: string;
  bodyHtml: string;
  footerHtml: string;
}) {
  const { preheader, headlineTop, headlineBottom, bodyHtml, footerHtml } = params;

  // Accent: Use only one accent color (red) for premium edge.
  const ACCENT = "#ff0000";
  const BG = "#050505";
  const FG = "#ffffff";
  const MUTED = "rgba(255,255,255,0.72)";
  const SOFT = "rgba(255,255,255,0.12)";
  const SOFT2 = "rgba(255,255,255,0.08)";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>MUGEN DISTRICT</title>
  </head>
  <body style="margin:0;padding:0;background:${BG};color:${FG};font-family:Arial, Helvetica, sans-serif;">
    <!-- Preheader (hidden) -->
    <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
      ${esc(preheader)}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${BG};">
      <tr>
        <td align="center" style="padding:28px 16px 48px;">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="border-collapse:collapse;max-width:640px;width:100%;">
            <!-- Brand Header -->
            <tr>
              <td style="padding:0 0 16px;">
                <div style="letter-spacing:0.12em;font-weight:700;font-size:12px;color:${MUTED};text-transform:uppercase;">
                  MUGEN DISTRICT
                </div>

                <div style="margin-top:10px;">
                  <div style="font-weight:900;font-size:28px;line-height:1.08;letter-spacing:-0.02em;">
                    ${esc(headlineTop)}
                  </div>
                  <div style="font-weight:900;font-size:28px;line-height:1.08;letter-spacing:-0.02em;">
                    ${esc(headlineBottom)}
                  </div>
                </div>

                <!-- Sharp divider -->
                <div style="margin-top:18px;height:2px;background:${SOFT};"></div>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:0;">
                ${bodyHtml}
              </td>
            </tr>

            <!-- Footer / Manifesto -->
            <tr>
              <td style="padding:28px 0 0;">
                <div style="height:2px;background:${SOFT2};"></div>
                <div style="padding-top:18px;">
                  ${footerHtml}
                </div>
              </td>
            </tr>

            <!-- Micro footer -->
            <tr>
              <td style="padding:18px 0 0;">
                <div style="font-size:12px;line-height:1.5;color:${MUTED};">
                  If you didn't place this order, reply to this email immediately.
                </div>
                <div style="margin-top:10px;font-size:12px;line-height:1.5;color:${MUTED};">
                  <span style="color:${ACCENT};">—</span> MUGEN DISTRICT • Unlimited Territory
                </div>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderOrderTable(params: {
  items: EmailOrderItem[];
  currency: string;
  totalCents: number;
}) {
  const { items, currency, totalCents } = params;

  const rows = items
    .map((it) => {
      const size = (it.size || "M").toUpperCase();
      const sku = (it.sku || "").trim();
      return `
        <tr>
          <td style="padding:14px 12px;border-bottom:1px solid rgba(255,255,255,0.10);vertical-align:top;">
            <div style="font-weight:800;font-size:14px;line-height:1.25;">${esc(it.title)}</div>
            <div style="margin-top:6px;font-size:12px;line-height:1.4;color:rgba(255,255,255,0.72);">
              ${sku ? `SKU: ${esc(sku)} • ` : ""}Size: ${esc(size)} • Qty: ${esc(it.qty)}
            </div>
            ${
              it.limited
                ? `<div style="margin-top:6px;font-size:12px;line-height:1.4;color:#ffffff;">
              Limited Archive piece confirmed${typeof it.remainingQty === "number" ? ` • ${esc(it.remainingQty)} left` : ""}
            </div>`
                : ""
            }
          </td>
          <td align="right" style="padding:14px 12px;border-bottom:1px solid rgba(255,255,255,0.10);vertical-align:top;">
            <div style="font-weight:900;font-size:14px;">${esc(
              formatMoney(it.lineTotalCents, it.currency || currency)
            )}</div>
            <div style="margin-top:6px;font-size:12px;color:rgba(255,255,255,0.72);">
              Unit: ${esc(formatMoney(it.unitPriceCents, it.currency || currency))}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  const total = formatMoney(totalCents, currency);

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:14px;border:1px solid rgba(255,255,255,0.12);">
      <thead>
        <tr>
          <th align="left" style="padding:12px 12px;border-bottom:1px solid rgba(255,255,255,0.12);font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.72);">
            Archive Items
          </th>
          <th align="right" style="padding:12px 12px;border-bottom:1px solid rgba(255,255,255,0.12);font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.72);">
            Total
          </th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr>
          <td style="padding:14px 12px;">
            <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.72);">
              Grand Total
            </div>
          </td>
          <td align="right" style="padding:14px 12px;">
            <div style="font-weight:950;font-size:18px;letter-spacing:-0.01em;">${esc(
              total
            )}</div>
          </td>
        </tr>
      </tbody>
    </table>
  `;
}

function renderCustomerBody(payload: OrderEmailPayload) {
  const hasLimitedPiece = payload.items.some((item) => item.limited);
  const orderLine = `<div style="margin-top:18px;">
    <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.72);">Order</div>
    <div style="margin-top:6px;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;font-size:15px;line-height:1.35;">
      ${esc(payload.orderNumber)}
    </div>
  </div>`;

  const statusPanel = `
    <div style="margin-top:18px;padding:14px 12px;border:1px solid rgba(255,255,255,0.12);">
      <div style="font-weight:800;font-size:14px;letter-spacing:0.02em;">
        ORDER CONFIRMED.
      </div>
      <div style="margin-top:8px;font-size:13px;line-height:1.6;color:rgba(255,255,255,0.82);">
        Your archive pull is locked.<br/>
        ${hasLimitedPiece ? "Limited Archive piece confirmed.<br/>" : ""}
        We will message you next with payment and delivery details.
      </div>
    </div>
  `;

  const addressOneLine = joinAddressOneLine(payload.shippingAddress);
  const shippingBlock = `
    <div style="margin-top:18px;">
      <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.72);">Shipping</div>
      <div style="margin-top:8px;font-size:13px;line-height:1.6;">
        <div style="font-weight:800;">${esc(safeName(payload.customerName))}</div>
        <div style="color:rgba(255,255,255,0.82);">${esc(addressOneLine || "—")}</div>
        ${
          payload.customerPhone
            ? `<div style="color:rgba(255,255,255,0.72);margin-top:6px;">Phone: ${esc(
                payload.customerPhone
              )}</div>`
            : ""
        }
      </div>
    </div>
  `;

  const note = (payload.deliveryNote || "").trim();
  const noteBlock = note
    ? `
    <div style="margin-top:14px;padding:12px;border:1px solid rgba(255,255,255,0.10);">
      <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.72);">Delivery Note</div>
      <div style="margin-top:8px;font-size:13px;line-height:1.6;color:rgba(255,255,255,0.82);">${esc(
        note
      )}</div>
    </div>
  `
    : "";

  const table = renderOrderTable({
    items: payload.items,
    currency: payload.currency,
    totalCents: payload.totalCents,
  });

  const trustLine = `
    <div style="margin-top:18px;font-size:12px;line-height:1.6;color:rgba(255,255,255,0.72);">
      This is a manual-payment order. Keep this email for your records and use the fast lane below if you want immediate support.
    </div>
  `;

  const nextSteps = `
    <div style="margin-top:18px;padding:14px 12px;border:1px solid rgba(255,255,255,0.12);">
      <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.72);">Next Steps</div>
      <div style="margin-top:8px;font-size:13px;line-height:1.7;color:rgba(255,255,255,0.82);">
        1. We review the order and confirm payment options.<br/>
        2. We message you with delivery timing.<br/>
        3. For a faster line, hit WhatsApp or keep up with the archive on Instagram.
      </div>
    </div>
  `;

  const linksBlock = `
    <div style="margin-top:18px;">
      <a href="${WHATSAPP_SUPPORT_URL}" style="display:inline-block;padding:12px 16px;border:1px solid rgba(255,255,255,0.18);color:#ffffff;text-decoration:none;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">
        WhatsApp Support
      </a>
      <a href="${INSTAGRAM_URL}" style="display:inline-block;margin-left:10px;padding:12px 16px;border:1px solid rgba(255,255,255,0.12);color:#ffffff;text-decoration:none;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
        Instagram
      </a>
    </div>
  `;

  return `
    ${statusPanel}
    ${orderLine}
    ${table}
    ${shippingBlock}
    ${noteBlock}
    ${nextSteps}
    ${linksBlock}
    ${trustLine}
  `;
}

function renderCustomerFooter() {
  return `
    <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.72);">
      The Archive
    </div>
    <div style="margin-top:10px;font-size:13px;line-height:1.7;color:rgba(255,255,255,0.82);">
      Mugen District is the intersection of West African grit and Neo-Tokyo aesthetics.
      We don't just drop clothes; we archive movements. Established 2026.
      From the coast of Gambia to the heart of Shibuya.
    </div>
    <div style="margin-top:14px;font-size:13px;line-height:1.7;color:rgba(255,255,255,0.82);">
      <span style="color:rgba(255,255,255,0.72);">Support:</span>
      <span style="font-weight:800;"> reply to this email</span>
    </div>
    <div style="margin-top:10px;font-size:13px;line-height:1.7;color:rgba(255,255,255,0.82);">
      WhatsApp: <a href="${WHATSAPP_SUPPORT_URL}" style="color:#ffffff;">${WHATSAPP_SUPPORT_URL}</a><br/>
      Instagram: <a href="${INSTAGRAM_URL}" style="color:#ffffff;">${INSTAGRAM_URL}</a>
    </div>
  `;
}

function renderAdminBody(payload: OrderEmailPayload) {
  const addressLines = nonEmptyLines(payload.shippingAddress);
  const addressHtml = addressLines.length
    ? addressLines.map((l) => `<div>${esc(l)}</div>`).join("")
    : `<div>—</div>`;

  const header = `
    <div style="margin-top:18px;padding:14px 12px;border:1px solid rgba(255,255,255,0.12);">
      <div style="font-weight:900;font-size:14px;letter-spacing:0.10em;text-transform:uppercase;">
        New Order • ${esc(payload.orderNumber)}
      </div>
      <div style="margin-top:8px;font-size:13px;line-height:1.6;color:rgba(255,255,255,0.82);">
        Manual payment required. Contact customer to finalize payment + delivery.
      </div>
    </div>
  `;

  const customer = `
    <div style="margin-top:18px;">
      <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.72);">
        Customer
      </div>
      <div style="margin-top:8px;font-size:13px;line-height:1.6;">
        <div style="font-weight:900;">${esc(safeName(payload.customerName))}</div>
        <div style="color:rgba(255,255,255,0.82);">${esc(payload.customerEmail || "—")}</div>
        <div style="color:rgba(255,255,255,0.72);margin-top:6px;">Phone: ${esc(
          payload.customerPhone || "—"
        )}</div>
      </div>
    </div>
  `;

  const shipping = `
    <div style="margin-top:18px;">
      <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.72);">
        Shipping Address
      </div>
      <div style="margin-top:8px;font-size:13px;line-height:1.6;color:rgba(255,255,255,0.82);">
        ${addressHtml}
      </div>
    </div>
  `;

  const note = (payload.deliveryNote || "").trim();
  const noteBlock = note
    ? `
      <div style="margin-top:14px;padding:12px;border:1px solid rgba(255,255,255,0.10);">
        <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.72);">Delivery Note</div>
        <div style="margin-top:8px;font-size:13px;line-height:1.6;color:rgba(255,255,255,0.82);">${esc(
          note
        )}</div>
      </div>
    `
    : "";

  const table = renderOrderTable({
    items: payload.items,
    currency: payload.currency,
    totalCents: payload.totalCents,
  });

  return `
    ${header}
    ${customer}
    ${shipping}
    ${noteBlock}
    ${table}
  `;
}

function renderAdminFooter() {
  return `
    <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.72);">
      Ops Note
    </div>
    <div style="margin-top:10px;font-size:13px;line-height:1.7;color:rgba(255,255,255,0.82);">
      Confirm payment method with customer, then schedule delivery. Keep a screenshot of this order.
    </div>
  `;
}

export function customerOrderEmail(payload: OrderEmailPayload): EmailTemplate {
  const subject = `Order Confirmed — ${payload.orderNumber} | MUGEN DISTRICT`;
  const preheader = `Order confirmed: ${payload.orderNumber}. Next steps, support, and archive links inside.`;

  const html = wrapHtml({
    preheader,
    headlineTop: "ORDER CONFIRMED.",
    headlineBottom: "TOKYO GRIT LOGGED.",
    bodyHtml: renderCustomerBody(payload),
    footerHtml: renderCustomerFooter(),
  });

  const text = [
    "MUGEN DISTRICT",
    "",
    "ORDER CONFIRMED.",
    "Tokyo grit. Archive locked.",
    "We will message you next with payment and delivery details.",
    "",
    `Order Ref: ${payload.orderNumber}`,
    "",
    "Items:",
    orderItemsText(payload.items),
    "",
    `Total: ${formatMoney(payload.totalCents, payload.currency)}`,
    "",
    "Shipping:",
    `${safeName(payload.customerName)}`,
    `${joinAddressOneLine(payload.shippingAddress) || "—"}`,
    payload.customerPhone ? `Phone: ${payload.customerPhone}` : "",
    payload.deliveryNote ? `Note: ${payload.deliveryNote}` : "",
    "",
    "Next Steps:",
    "1. Watch for payment instructions.",
    "2. Watch for delivery timing.",
    `3. WhatsApp support: ${WHATSAPP_SUPPORT_URL}`,
    `4. Instagram: ${INSTAGRAM_URL}`,
    "",
    "THE ARCHIVE",
    "Mugen District is the intersection of West African grit and Neo-Tokyo aesthetics.",
    "We don't just drop clothes; we archive movements. Established 2026.",
    "From the coast of Gambia to the heart of Shibuya.",
    "",
    "— MUGEN DISTRICT • Unlimited Territory",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

export function adminOrderEmail(payload: OrderEmailPayload): EmailTemplate {
  const subject = `NEW ORDER • ${payload.orderNumber}`;
  const preheader = `New manual-payment order: ${payload.orderNumber}. Customer + shipping details inside.`;

  const html = wrapHtml({
    preheader,
    headlineTop: "NEW ORDER",
    headlineBottom: "ARCHIVE ENTRY",
    bodyHtml: renderAdminBody(payload),
    footerHtml: renderAdminFooter(),
  });

  const text = [
    "MUGEN DISTRICT — ADMIN",
    "",
    `NEW ORDER: ${payload.orderNumber}`,
    "",
    "Customer:",
    `${safeName(payload.customerName)}`,
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
    "Ops Note: Confirm payment method, then schedule delivery.",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
