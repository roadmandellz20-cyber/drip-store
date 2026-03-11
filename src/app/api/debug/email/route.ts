import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

const VERIFIED_FROM = "Mugen District <orders@mugendistrict.com>";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isDebugRouteEnabled() {
  const enabled = asString(process.env.ENABLE_DEBUG_ROUTES).toLowerCase();
  return process.env.NODE_ENV !== "production" && enabled === "true";
}

async function requireDebugAccess(request: NextRequest) {
  if (!isDebugRouteEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!(await verifyAdminSession(sessionCookie))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

function getDebugSender() {
  return VERIFIED_FROM;
}

function parseResendResponseBody(raw: string) {
  try {
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    return raw || null;
  }
}

async function sendDebugEmail(toOverride: string) {
  const apiKey = asString(process.env.RESEND_API_KEY);
  const adminEmail = asString(process.env.ADMIN_ORDER_EMAIL);
  const to = toOverride || adminEmail;

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing RESEND_API_KEY",
        has_resend_api_key: false,
      },
      { status: 500 }
    );
  }

  if (!to) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing recipient. Pass ?to=... or set ADMIN_ORDER_EMAIL",
      },
      { status: 400 }
    );
  }

  const from = getDebugSender();
  const subject = `Resend debug test ${new Date().toISOString()}`;
  const text = "Resend debug endpoint test email.";
  const html = "<p>Resend debug endpoint test email.</p>";

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
      text,
      html,
    }),
  });

  const raw = await response.text();
  const body = parseResendResponseBody(raw);

  console.log("[debug/email] resend response", {
    status: response.status,
    body,
    from,
    to,
    subject,
  });

  return NextResponse.json(
    {
      ok: response.ok,
      resend_status: response.status,
      resend_body: body,
      raw_response: raw,
      from,
      to,
      subject,
      env_presence: {
        resend_api_key: true,
        resend_from_email: !!asString(process.env.RESEND_FROM_EMAIL),
        admin_order_email: !!adminEmail,
      },
    },
    { status: response.ok ? 200 : 500 }
  );
}

export async function GET(request: NextRequest) {
  const denied = await requireDebugAccess(request);
  if (denied) {
    return denied;
  }

  const url = new URL(request.url);
  const to = asString(url.searchParams.get("to"));
  return sendDebugEmail(to);
}

export async function POST(request: NextRequest) {
  const denied = await requireDebugAccess(request);
  if (denied) {
    return denied;
  }

  const body = (await request.json().catch(() => ({}))) as { to?: string };
  return sendDebugEmail(asString(body.to));
}
