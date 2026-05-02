// src/lib/email/templates.ts
// MUGEN DISTRICT — Gmail-safe transactional email templates (table layout, inline styles only).

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

const FALLBACK_TEST_IMAGE = `${SUPABASE_STORAGE}/ichigo-01.JPG`;

const TEST_ITEM_FALLBACKS: Record<string, string> = {
  "test-product-01": "ichigo-01",
  "test-product-02": "luffy-01",
  "test-product-03": "ulquiorra-01",
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

function firstNameOnly(name?: string): string {
  const n = (name || "").trim();
  if (!n) return "there";
  return n.split(/\s+/)[0] ?? "there";
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
  if (!sku) return FALLBACK_TEST_IMAGE;
  if (sku.startsWith("test-")) return FALLBACK_TEST_IMAGE;
  return `${SUPABASE_STORAGE}/${sku}.JPG`;
}

function itemImageUrl(sku: string | undefined): string {
  const s = (sku || "").trim();
  if (!s) return FALLBACK_TEST_IMAGE;
  if (s.startsWith("test-")) {
    const fallback = TEST_ITEM_FALLBACKS[s] ?? "ichigo-01";
    return `${SUPABASE_STORAGE}/${fallback}.JPG`;
  }
  return `${SUPABASE_STORAGE}/${s}.JPG`;
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

// ─── Customer item rows (Everlane-style, white card) ─────────────────────────

function buildCustomerItemRows(items: EmailOrderItem[]) {
  return items
    .map((it) => {
      const img = itemImageUrl(it.sku);
      const name = esc(it.title);
      const sku = esc(it.sku?.trim() || "—");
      const size = esc((it.size || "M").toUpperCase());
      return `<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td width="120" valign="top" style="padding-top:20px;padding-bottom:20px;padding-left:0;padding-right:0;">
      <img src="${img}" width="100" height="100" style="display:block;width:100px;height:100px;object-fit:cover;" alt="${name}" />
    </td>
    <td valign="top" style="padding-top:20px;padding-bottom:20px;padding-left:16px;padding-right:0;">
      <p style="margin-top:0;margin-bottom:4px;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:14px;font-weight:bold;color:#111111;">${name}</p>
      <p style="margin-top:0;margin-bottom:2px;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:12px;color:#888888;">SKU: ${sku}</p>
      <p style="margin-top:0;margin-bottom:2px;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:12px;color:#888888;">Size: ${size}</p>
      <p style="margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:12px;color:#888888;">Quantity: ${esc(it.qty)}</p>
    </td>
    <td valign="top" align="right" style="padding-top:20px;padding-bottom:20px;padding-left:0;padding-right:0;">
      <p style="margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:14px;font-weight:bold;color:#111111;">GMD ${esc(formatMajor(it.lineTotalCents))}</p>
    </td>
  </tr>
</table>`;
    })
    .join("");
}

// ─── Admin item rows (dark theme) ────────────────────────────────────────────

function buildAdminItemRows(items: EmailOrderItem[]) {
  return items
    .map(
      (it) =>
        `<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding-top:16px;padding-bottom:16px;padding-left:0;padding-right:0;border-top:1px solid #1a1a1a;">
      <p style="margin-top:0;margin-bottom:5px;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;">${esc(it.title)}</p>
      <p style="margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;font-family:Courier New,Courier,monospace;font-size:11px;color:#555555;">SKU: ${esc(it.sku?.trim() || "—")} &nbsp;&bull;&nbsp; SIZE: ${esc((it.size || "M").toUpperCase())} &nbsp;&bull;&nbsp; QTY: ${esc(it.qty)}</p>
    </td>
    <td align="right" valign="top" style="padding-top:16px;padding-bottom:16px;padding-left:0;padding-right:0;border-top:1px solid #1a1a1a;">
      <p style="margin-top:0;margin-bottom:4px;margin-left:0;margin-right:0;font-family:Courier New,Courier,monospace;font-size:15px;font-weight:bold;color:#ffffff;">GMD ${esc(formatMajor(it.lineTotalCents))}</p>
      <p style="margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;font-family:Courier New,Courier,monospace;font-size:11px;color:#555555;">Unit: GMD ${esc(formatMajor(it.unitPriceCents))}</p>
    </td>
  </tr>
</table>`
    )
    .join("");
}

// ─── Divider helper ───────────────────────────────────────────────────────────

function dividerRow(hPadding = 32) {
  return `<tr>
<td style="padding-top:0;padding-bottom:0;padding-left:${hPadding}px;padding-right:${hPadding}px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td style="border-bottom:1px solid #eeeeee;font-size:1px;line-height:1px;">&nbsp;</td></tr>
  </table>
</td>
</tr>`;
}

// ─── Customer HTML — Everlane-style white card ────────────────────────────────

function buildCustomerEmailHtml(payload: OrderEmailPayload): string {
  const imgUrl = heroImageUrl(payload.items);
  const productName = esc(payload.items[0]?.title ?? "Mugen District");
  const firstName = esc(firstNameOnly(payload.customerName));

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
<body style="margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;padding-top:0;padding-bottom:0;padding-left:0;padding-right:0;background-color:#000000;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000">
<tr>
<td align="center" style="background-color:#000000;padding-top:32px;padding-bottom:32px;padding-left:0;padding-right:0;">

  <!-- White card -->
  <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background-color:#ffffff;">

    <!-- Hero image -->
    <tr>
    <td style="padding-top:0;padding-bottom:0;padding-left:0;padding-right:0;">
      <img src="${imgUrl}" width="600" height="280" style="display:block;width:100%;height:280px;object-fit:cover;" alt="${productName}" />
    </td>
    </tr>

    <!-- Brand name -->
    <tr>
    <td align="center" style="padding-top:28px;padding-bottom:4px;padding-left:0;padding-right:0;background-color:#ffffff;">
      <p style="margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:4px;color:#aaaaaa;text-transform:uppercase;">MUGEN DISTRICT</p>
    </td>
    </tr>

    <!-- Heading -->
    <tr>
    <td align="center" style="padding-top:16px;padding-bottom:8px;padding-left:40px;padding-right:40px;background-color:#ffffff;">
      <h1 style="margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;font-family:Georgia,Times New Roman,Times,serif;font-size:28px;font-weight:300;color:#111111;line-height:1.2;">Thanks for your order, ${firstName}.</h1>
    </td>
    </tr>

    <!-- Order number -->
    <tr>
    <td align="center" style="padding-top:8px;padding-bottom:0;padding-left:0;padding-right:0;background-color:#ffffff;">
      <p style="margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:13px;color:#aaaaaa;">Order No. ${esc(payload.orderNumber)}</p>
    </td>
    </tr>

    <!-- Three-column info row -->
    <tr>
    <td style="padding-top:0;padding-bottom:0;padding-left:0;padding-right:0;background-color:#ffffff;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="33%" valign="top" style="padding-top:24px;padding-bottom:24px;padding-left:32px;padding-right:16px;border-right:1px solid #eeeeee;">
          <p style="margin-top:0;margin-bottom:6px;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:12px;font-style:italic;color:#aaaaaa;">Shipping to</p>
          <p style="margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:13px;font-weight:bold;color:#333333;line-height:1.5;">${esc(safeName(payload.customerName))}<br>${addressHtml}</p>
        </td>
        <td width="33%" valign="top" align="center" style="padding-top:24px;padding-bottom:24px;padding-left:16px;padding-right:16px;border-right:1px solid #eeeeee;">
          <p style="margin-top:0;margin-bottom:6px;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:12px;font-style:italic;color:#aaaaaa;">Order reference</p>
          <p style="margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:13px;font-weight:bold;color:#333333;">${esc(payload.orderNumber)}</p>
        </td>
        <td width="33%" valign="top" align="right" style="padding-top:24px;padding-bottom:24px;padding-left:16px;padding-right:32px;">
          <p style="margin-top:0;margin-bottom:6px;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:12px;font-style:italic;color:#aaaaaa;">Date ordered</p>
          <p style="margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:13px;font-weight:bold;color:#333333;">${esc(todayString())}</p>
        </td>
      </tr>
      </table>
    </td>
    </tr>

    ${dividerRow()}

    <!-- Order Summary title -->
    <tr>
    <td align="center" style="padding-top:28px;padding-bottom:16px;padding-left:0;padding-right:0;background-color:#ffffff;">
      <p style="margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:2px;color:#aaaaaa;text-transform:uppercase;">Your Order Summary</p>
    </td>
    </tr>

    ${dividerRow()}

    <!-- Items -->
    <tr>
    <td style="padding-top:0;padding-bottom:0;padding-left:32px;padding-right:32px;background-color:#ffffff;">
      ${buildCustomerItemRows(payload.items)}
    </td>
    </tr>

    ${dividerRow()}

    <!-- Total -->
    <tr>
    <td style="padding-top:16px;padding-bottom:16px;padding-left:32px;padding-right:32px;background-color:#ffffff;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td><p style="margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:14px;color:#333333;">Total</p></td>
        <td align="right"><p style="margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:18px;font-weight:bold;color:#111111;">GMD ${esc(formatMajor(payload.totalCents))}</p></td>
      </tr>
      </table>
    </td>
    </tr>

    ${dividerRow()}

    <!-- What happens next + WhatsApp button -->
    <tr>
    <td style="padding-top:32px;padding-bottom:32px;padding-left:40px;padding-right:40px;background-color:#ffffff;">
      <p style="margin-top:0;margin-bottom:16px;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:14px;color:#333333;line-height:1.7;">We&rsquo;ll reach out via WhatsApp to confirm payment and arrange delivery. Your piece is secured &mdash; no restocks once this run is gone.</p>
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background-color:#111111;padding-top:14px;padding-bottom:14px;padding-left:28px;padding-right:28px;">
            <a href="https://wa.me/2203340558" style="font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:11px;font-weight:bold;letter-spacing:2px;color:#ffffff;text-decoration:none;text-transform:uppercase;display:block;">CONTACT US ON WHATSAPP &#8594;</a>
          </td>
        </tr>
      </table>
    </td>
    </tr>

    <!-- Footer -->
    <tr>
    <td align="center" style="padding-top:24px;padding-bottom:24px;padding-left:32px;padding-right:32px;border-top:1px solid #eeeeee;background-color:#ffffff;">
      <p style="margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2px;color:#aaaaaa;text-transform:uppercase;">MUGEN DISTRICT &bull; <a href="https://mugendistrict.com/privacy" style="font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2px;color:#aaaaaa;text-decoration:none;text-transform:uppercase;">Privacy Policy</a></p>
      <p style="margin-top:8px;margin-bottom:0;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:11px;color:#cccccc;">Limited archive release. No mass restocks. Enter the Mugen.</p>
    </td>
    </tr>

  </table>

</td>
</tr>
</table>
</body>
</html>`;
}

// ─── Admin HTML — dark theme ──────────────────────────────────────────────────

function buildAdminEmailHtml(payload: OrderEmailPayload): string {
  const imgUrl = heroImageUrl(payload.items);
  const productName = esc(payload.items[0]?.title ?? "Mugen District");

  const addressLines = nonEmptyLines(payload.shippingAddress);
  const addressHtml = addressLines.length
    ? addressLines.map((l) => esc(l)).join("<br>")
    : "—";

  const deliveryNote = (payload.deliveryNote || "").trim();
  const deliveryNoteBlock = deliveryNote
    ? `<p style="margin-top:12px;margin-bottom:0;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:3px;color:#555555;text-transform:uppercase;">Delivery Note</p>
<p style="margin-top:4px;margin-bottom:0;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:13px;color:#888888;">${esc(deliveryNote)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;padding-top:0;padding-bottom:0;padding-left:0;padding-right:0;background-color:#000000;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000">
<tr>
<td align="center" style="background-color:#000000;padding-top:0;padding-bottom:0;padding-left:0;padding-right:0;">

  <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000">

    <!-- Hero image -->
    <tr>
    <td style="padding-top:0;padding-bottom:0;padding-left:0;padding-right:0;">
      <img src="${imgUrl}" width="600" height="400" style="display:block;width:100%;height:auto;" alt="${productName}" />
    </td>
    </tr>

    <!-- Content -->
    <tr>
    <td style="padding-top:48px;padding-bottom:48px;padding-left:48px;padding-right:48px;background-color:#000000;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">

      <!-- Brand label -->
      <tr>
      <td style="padding-bottom:40px;">
        <p style="margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:3px;color:#666666;text-transform:uppercase;">MUGEN DISTRICT &#28961;&#38480;</p>
      </td>
      </tr>

      <!-- Heading -->
      <tr>
      <td style="padding-bottom:32px;border-bottom:1px solid #222222;">
        <h1 style="margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:36px;font-weight:800;color:#ffffff;letter-spacing:-1px;line-height:1;text-transform:uppercase;">NEW ORDER<br>ARCHIVE ENTRY.</h1>
      </td>
      </tr>

      <!-- Preorder flag -->
      <tr>
      <td style="padding-top:24px;padding-bottom:24px;padding-left:0;padding-right:0;border-bottom:1px solid #222222;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="border-left:3px solid #c0392b;padding-left:16px;">
            <p style="margin-top:0;margin-bottom:4px;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:3px;color:#c0392b;text-transform:uppercase;">&#9888; Preorder &mdash; Ships End of Week</p>
            <p style="margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:12px;color:#888888;">Contact customer via WhatsApp before dispatch.</p>
          </td>
        </tr>
        </table>
      </td>
      </tr>

      <!-- Order ref -->
      <tr>
      <td style="padding-top:32px;padding-bottom:32px;padding-left:0;padding-right:0;border-bottom:1px solid #222222;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td>
            <p style="margin-top:0;margin-bottom:6px;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:3px;color:#555555;text-transform:uppercase;">Order Reference</p>
            <p style="margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;font-family:Courier New,Courier,monospace;font-size:18px;font-weight:bold;color:#ffffff;">${esc(payload.orderNumber)}</p>
          </td>
          <td align="right">
            <p style="margin-top:0;margin-bottom:6px;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:3px;color:#555555;text-transform:uppercase;">Date</p>
            <p style="margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;font-family:Courier New,Courier,monospace;font-size:11px;color:#555555;">${esc(todayString())}</p>
          </td>
        </tr>
        </table>
      </td>
      </tr>

      <!-- Customer -->
      <tr>
      <td style="padding-top:32px;padding-bottom:32px;padding-left:0;padding-right:0;border-bottom:1px solid #222222;">
        <p style="margin-top:0;margin-bottom:12px;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:3px;color:#555555;text-transform:uppercase;">Customer</p>
        <p style="margin-top:0;margin-bottom:3px;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;">${esc(safeName(payload.customerName))}</p>
        <p style="margin-top:0;margin-bottom:3px;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:13px;color:#888888;">${esc(payload.customerEmail || "—")}</p>
        <p style="margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:13px;color:#888888;">${esc(payload.customerPhone || "—")}</p>
      </td>
      </tr>

      <!-- Shipping -->
      <tr>
      <td style="padding-top:32px;padding-bottom:32px;padding-left:0;padding-right:0;border-bottom:1px solid #222222;">
        <p style="margin-top:0;margin-bottom:12px;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:3px;color:#555555;text-transform:uppercase;">Shipping Address</p>
        <p style="margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:14px;color:#888888;line-height:1.7;">${addressHtml}</p>
        ${deliveryNoteBlock}
      </td>
      </tr>

      <!-- Items -->
      <tr>
      <td style="padding-top:32px;padding-bottom:32px;padding-left:0;padding-right:0;border-bottom:1px solid #222222;">
        <p style="margin-top:0;margin-bottom:20px;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:3px;color:#555555;text-transform:uppercase;">Archive Items</p>
        ${buildAdminItemRows(payload.items)}
      </td>
      </tr>

      <!-- Total -->
      <tr>
      <td style="padding-top:32px;padding-bottom:32px;padding-left:0;padding-right:0;border-bottom:1px solid #222222;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td><p style="margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:3px;color:#555555;text-transform:uppercase;">Grand Total</p></td>
          <td align="right"><p style="margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;font-family:Courier New,Courier,monospace;font-size:20px;font-weight:bold;color:#ffffff;">GMD ${esc(formatMajor(payload.totalCents))}</p></td>
        </tr>
        </table>
      </td>
      </tr>

      <!-- Footer -->
      <tr>
      <td style="padding-top:48px;">
        <p style="margin-top:0;margin-bottom:6px;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:3px;color:#333333;text-transform:uppercase;">MUGEN DISTRICT &mdash; ARCHIVE DROP SYSTEM</p>
        <p style="margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:11px;color:#333333;">Manual payment required. Confirm via WhatsApp before dispatch.</p>
      </td>
      </tr>

    </table>
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
  const subject = `Thanks for your order — ${payload.orderNumber}`;
  const text = [
    "MUGEN DISTRICT",
    "",
    `Thanks for your order, ${firstNameOnly(payload.customerName)}.`,
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
    "We'll reach out via WhatsApp to confirm payment and arrange delivery.",
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
  const subject = `⚠ NEW ORDER — ${payload.orderNumber} — ${safeName(payload.customerName)}`;
  const text = [
    "MUGEN DISTRICT — ADMIN",
    "",
    "NEW ORDER",
    "Contact customer via WhatsApp to confirm payment and arrange delivery.",
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
