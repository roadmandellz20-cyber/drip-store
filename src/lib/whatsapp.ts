export const WHATSAPP_BUSINESS_PHONE = "2203340558";

function formatAmount(total: number) {
  if (!Number.isFinite(total)) return "0";

  const hasDecimals = !Number.isInteger(total);
  return total.toLocaleString("en-US", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  });
}

export function normalizeWhatsAppPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function buildWhatsAppConfirmationMessage(params: {
  orderRef: string;
  name: string;
  itemsSummary: string;
  total: number;
  currency: string;
}) {
  return `ENTER THE MUGEN.

Order Locked: ${params.orderRef}

Name: ${params.name}
Items: ${params.itemsSummary}
Total: ${params.currency} ${formatAmount(params.total)}

— MUGEN DISTRICT`;
}

export function buildWhatsAppUrl(params: {
  phone?: string;
  message: string;
}) {
  const cleanPhone = normalizeWhatsAppPhone(params.phone || WHATSAPP_BUSINESS_PHONE);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(params.message)}`;
}
