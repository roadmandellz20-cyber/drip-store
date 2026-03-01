import "server-only";

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
};

export type SendEmailResult = {
  status: number;
  id?: string;
};

export class ResendRequestError extends Error {
  status: number;
  body: unknown;
  to: string;
  from: string;
  subject: string;

  constructor(args: {
    message: string;
    status: number;
    body: unknown;
    to: string;
    from: string;
    subject: string;
  }) {
    super(args.message);
    this.name = "ResendRequestError";
    this.status = args.status;
    this.body = args.body;
    this.to = args.to;
    this.from = args.from;
    this.subject = args.subject;
  }
}

const VERIFIED_FROM = "Mugen District <orders@mugendistrict.com>";

function isEmailDebugEnabled() {
  const value = (process.env.EMAIL_DEBUG || "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

function getResendConfig() {
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  const fromEmail = (process.env.RESEND_FROM_EMAIL || "").trim();
  const fromName = (process.env.RESEND_FROM_NAME || "").trim() || "Mugen District";
  const from =
    fromEmail && fromName ? `${fromName} <${fromEmail}>` : fromEmail || VERIFIED_FROM;
  const replyTo =
    (process.env.RESEND_REPLY_TO || "").trim() ||
    (process.env.ADMIN_ORDER_EMAIL || "").trim() ||
    "";

  return { apiKey, from, replyTo };
}

function messageFromResendBody(body: unknown, status: number) {
  if (body && typeof body === "object") {
    const parsed = body as Record<string, unknown>;
    if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message.trim();
    if (typeof parsed.error === "string" && parsed.error.trim()) return parsed.error.trim();
  }

  if (typeof body === "string" && body.trim()) return body.trim();
  return `Resend request failed (${status})`;
}

function parseResendResponseBody(raw: string) {
  try {
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    return raw || null;
  }
}

async function sendViaResend(args: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  debug: boolean;
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: args.from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      reply_to: args.replyTo || undefined,
      headers: args.headers,
    }),
  });

  const raw = await response.text();
  const body = parseResendResponseBody(raw);
  const parsed = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const id = typeof parsed?.id === "string" ? parsed.id : undefined;

  console.log("[email] resend response", {
    status: response.status,
    id,
    body,
    to: args.to,
    from: args.from,
    subject: args.subject,
  });

  if (args.debug) {
    console.log("[EMAIL_DEBUG] response", {
      status: response.status,
      id,
      body,
    });
  }

  return {
    ok: response.ok,
    status: response.status,
    id,
    body,
    message: messageFromResendBody(body, response.status),
  };
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  headers,
}: SendArgs): Promise<SendEmailResult> {
  const { apiKey, from, replyTo: defaultReplyTo } = getResendConfig();
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY.");
  }

  const debug = isEmailDebugEnabled();
  if (debug) {
    console.log("[EMAIL_DEBUG] request", { from, to, subject });
  }

  const primary = await sendViaResend({
    apiKey,
    from,
      to,
      subject,
      html,
      text,
      replyTo: replyTo || defaultReplyTo || undefined,
      headers,
      debug,
    });

  if (primary.ok) {
    return { status: primary.status, id: primary.id };
  }

  console.error("[email] resend request failed", {
    status: primary.status,
    body: primary.body,
    to,
    from,
    subject,
  });

  throw new ResendRequestError({
    message: primary.message,
    status: primary.status,
    body: primary.body,
    to,
    from,
    subject,
  });
}
