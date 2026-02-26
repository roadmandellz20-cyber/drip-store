import "server-only";

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult = {
  status: number;
  id?: string;
};

const FALLBACK_FROM_EMAIL = "onboarding@resend.dev";
const CONSUMER_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
]);

function isEmailDebugEnabled() {
  const value = (process.env.EMAIL_DEBUG || "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const configuredFrom = (process.env.RESEND_FROM_EMAIL || "").trim();
  const fromDomain = configuredFrom.split("@")[1]?.toLowerCase() || "";
  const shouldFallback =
    !configuredFrom || CONSUMER_EMAIL_DOMAINS.has(fromDomain);

  const from = shouldFallback ? FALLBACK_FROM_EMAIL : configuredFrom;

  if (shouldFallback && configuredFrom) {
    console.warn(
      `[email] RESEND_FROM_EMAIL (${configuredFrom}) may be unverified. Falling back to ${FALLBACK_FROM_EMAIL}.`
    );
  }

  return { apiKey, from };
}

export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<SendEmailResult> {
  const { apiKey, from } = getResendConfig();
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY.");
  }

  const debug = isEmailDebugEnabled();
  if (debug) {
    console.log("[EMAIL_DEBUG] request", { from, to, subject });
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text,
    }),
  });

  const raw = await response.text();
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    parsed = null;
  }

  const id = typeof parsed?.id === "string" ? parsed.id : undefined;

  if (debug) {
    console.log("[EMAIL_DEBUG] response", {
      status: response.status,
      id,
      body: parsed ?? raw,
    });
  }

  if (!response.ok) {
    console.error("[email] resend request failed", {
      status: response.status,
      body: parsed ?? raw,
      to,
      from,
      subject,
    });

    const message =
      (typeof parsed?.message === "string" && parsed.message) ||
      (typeof parsed?.error === "string" && parsed.error) ||
      raw ||
      `Resend request failed (${response.status})`;
    throw new Error(message);
  }

  return { status: response.status, id };
}
