const VERIFIED_FROM = "Mugen District <orders@mugendistrict.com>";
const RESEND_ONBOARDING_ADDRESS = "onboarding@resend.dev";

function extractEmailAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  if (match?.[1]) return match[1].trim().toLowerCase();
  return value.trim().toLowerCase();
}

export function resolveResendFromAddress(args: {
  rawFrom?: string;
  fallbackFrom?: string;
  fromName?: string;
}) {
  const rawFrom = (args.rawFrom || "").trim();
  const fallbackFrom = (args.fallbackFrom || "").trim();
  const fromName = (args.fromName || "").trim() || "Mugen District";
  const value = rawFrom || fallbackFrom || VERIFIED_FROM;

  const resolved =
    value.includes("<") && value.includes(">")
      ? value
      : `${fromName} <${value}>`;

  const address = extractEmailAddress(resolved);
  if (!address) {
    throw new Error("Missing verified Resend sender address.");
  }

  if (address === RESEND_ONBOARDING_ADDRESS) {
    throw new Error("RESEND sender must use your verified domain, not onboarding@resend.dev.");
  }

  return resolved;
}

export { VERIFIED_FROM };
