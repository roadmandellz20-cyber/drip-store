export type DeliveryStatus = "sent" | "failed" | "skipped";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function isBasicCustomerEmail(value: unknown) {
  const email = normalizeString(value);
  return email.length > 0 && email.includes("@");
}

export function normalizeDeliveryStatus(value: unknown) {
  const status = normalizeString(value).toLowerCase();
  if (status === "sent" || status === "failed" || status === "skipped") {
    return status as DeliveryStatus;
  }
  return "";
}

export function hasCustomerEmailBeenSent(args: {
  customerEmailStatus?: unknown;
  customerEmailSentAt?: unknown;
}) {
  return (
    normalizeDeliveryStatus(args.customerEmailStatus) === "sent" ||
    normalizeString(args.customerEmailSentAt).length > 0
  );
}

export function shouldSendCustomerConfirmation(args: {
  customerEmail?: unknown;
  customerEmailStatus?: unknown;
  customerEmailSentAt?: unknown;
}) {
  return (
    isBasicCustomerEmail(args.customerEmail) &&
    !hasCustomerEmailBeenSent({
      customerEmailStatus: args.customerEmailStatus,
      customerEmailSentAt: args.customerEmailSentAt,
    })
  );
}

export function deriveAggregateEmailStatus(args: {
  adminStatus: DeliveryStatus;
  customerStatus: DeliveryStatus;
}) {
  const statuses = [args.adminStatus, args.customerStatus];
  const sentCount = statuses.filter((status) => status === "sent").length;
  const failedCount = statuses.filter((status) => status === "failed").length;

  if (failedCount === 0) {
    return sentCount > 0 ? "sent" : "skipped";
  }

  return sentCount > 0 ? "partial" : "failed";
}
