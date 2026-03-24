import { NextResponse } from "next/server";
import { ResendRequestError, sendEmail } from "@/lib/email/send";
import { sanitizeEmailInput, sanitizeSingleLineInput } from "@/lib/input";
import {
  consumeRequestRateLimit,
  rateLimitJsonResponse,
} from "@/lib/request-rate-limit";
import { getSiteUrl } from "@/lib/site";

export const runtime = "nodejs";
const NEWSLETTER_RATE_LIMIT = {
  scope: "newsletter-signup",
  windowSeconds: 10 * 60,
  maxRequests: 5,
  blockSeconds: 15 * 60,
} as const;

function asString(value: unknown) {
  return sanitizeSingleLineInput(value);
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isValidEmail(value: string) {
  return value.length > 3 && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const message = "message" in error ? asString(error.message) : "";
    const details = "details" in error ? asString(error.details) : "";
    const hint = "hint" in error ? asString(error.hint) : "";

    return message || details || hint || "Newsletter signup failed.";
  }

  return "Newsletter signup failed.";
}

function isResendTestingRestriction(error: unknown) {
  if (!(error instanceof ResendRequestError)) return false;
  const message = errorMessage(error).toLowerCase();
  return message.includes("testing emails") || message.includes("verify a domain");
}

async function loadSupabaseAdmin() {
  const mod = await import("@/lib/supabase-admin");
  return mod.supabaseAdmin;
}

function isUniqueViolation(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      asString((error as { code?: unknown }).code) === "23505"
  );
}

async function persistNewsletterSignup(email: string) {
  const supabaseAdmin = await loadSupabaseAdmin();
  const { error } = await supabaseAdmin.from("waitlist").insert({
    contact: email,
    source: "newsletter",
    product_sku: null,
  });

  if (error) {
    if (isUniqueViolation(error)) {
      return "duplicate" as const;
    }
    throw new Error("waitlist_insert_failed");
  }

  return "inserted" as const;
}

function logEmailFailure(kind: "admin" | "customer", error: unknown) {
  if (error instanceof ResendRequestError) {
    console.error(`[newsletter] ${kind} email failed`, {
      status: error.status,
      body: error.body,
      from: error.from,
      to: error.to,
      subject: error.subject,
    });
    return;
  }

  console.error(`[newsletter] ${kind} email failed: ${errorMessage(error)}`);
}

function newsletterAdminHtml(email: string) {
  const safeEmail = escapeHtml(email);

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#050505;color:#fff;padding:24px;">
      <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.65);">Drop Signal</div>
      <h1 style="margin:12px 0 8px;font-size:28px;line-height:1.1;">New newsletter signup</h1>
      <p style="margin:0 0 16px;color:rgba(255,255,255,.78);">A new email joined the Mugen District drop list.</p>
      <div style="padding:14px 16px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);font-size:18px;font-weight:700;">
        ${safeEmail}
      </div>
    </div>
  `;
}

function newsletterCustomerHtml(email: string) {
  const safeEmail = escapeHtml(email);

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#050505;color:#fff;padding:24px;">
      <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.65);">Mugen District</div>
      <h1 style="margin:12px 0 8px;font-size:28px;line-height:1.1;">DROP SIGNAL CONFIRMED</h1>
      <p style="margin:0 0 12px;color:rgba(255,255,255,.82);">Early access. Password drops. Zero noise.</p>
      <p style="margin:0 0 12px;color:rgba(255,255,255,.7);">You're in with <strong>${safeEmail}</strong>. Watch your inbox.</p>
    </div>
  `;
}

export async function POST(request: Request) {
  try {
    const rateLimit = await consumeRequestRateLimit(NEWSLETTER_RATE_LIMIT, request);
    if (!rateLimit.allowed) {
      return rateLimitJsonResponse(
        "Too many signup attempts. Try again in a little bit.",
        rateLimit.retryAfterSeconds
      );
    }

    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = sanitizeEmailInput(body.email);

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "That email looks corrupted. Try again." },
        { status: 400 }
      );
    }

    const signupState = await persistNewsletterSignup(email);
    if (signupState === "duplicate") {
      return NextResponse.json({ ok: true, message: "You're in." });
    }

    const adminEmail =
      asString(process.env.NEWSLETTER_NOTIFY_EMAIL) ||
      asString(process.env.ADMIN_ORDER_EMAIL);
    let confirmationSent = false;

    if (adminEmail) {
      try {
        await sendEmail({
          to: adminEmail,
          subject: `DROP SIGNAL signup — ${email}`,
          html: newsletterAdminHtml(email),
          text: `New DROP SIGNAL signup: ${email}`,
          replyTo: email,
        });
      } catch (error) {
        logEmailFailure("admin", error);
      }
    } else {
      console.log("[newsletter] signup", { email });
    }

    const unsubscribeAddress =
      asString(process.env.RESEND_REPLY_TO) ||
      adminEmail ||
      "support@mugendistrict.com";

    try {
      await sendEmail({
        to: email,
        subject: "DROP SIGNAL CONFIRMED",
        html: newsletterCustomerHtml(email),
        text: "You're in. Watch your inbox.",
        replyTo: unsubscribeAddress,
        headers: {
          "List-Unsubscribe": `<mailto:${unsubscribeAddress}?subject=unsubscribe>, <${getSiteUrl()}/about>`,
        },
      });
      confirmationSent = true;
    } catch (error) {
      if (isResendTestingRestriction(error)) {
        console.warn("[newsletter] customer confirmation suppressed by Resend test-mode policy", {
          email,
        });
      } else {
        logEmailFailure("customer", error);
      }
    }

    return NextResponse.json({
      ok: true,
      message: confirmationSent ? "You're in. Watch your inbox." : "You're in.",
    });
  } catch (error) {
    console.error("[newsletter] persistence failed", error);
    return NextResponse.json(
      { ok: false, error: "Signup failed. Try again in a minute." },
      { status: 500 }
    );
  }
}
