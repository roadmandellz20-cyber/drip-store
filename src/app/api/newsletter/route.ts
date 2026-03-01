import { NextResponse } from "next/server";
import { ResendRequestError, sendEmail } from "@/lib/email/send";
import { getSiteUrl } from "@/lib/site";

export const runtime = "nodejs";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function asBooleanFlag(value: unknown) {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "Newsletter signup failed.";
}

function isResendTestingRestriction(error: unknown) {
  if (!(error instanceof ResendRequestError)) return false;
  const message = errorMessage(error).toLowerCase();
  return message.includes("testing emails") || message.includes("verify a domain");
}

function newsletterAdminHtml(email: string) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#050505;color:#fff;padding:24px;">
      <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.65);">Drop Signal</div>
      <h1 style="margin:12px 0 8px;font-size:28px;line-height:1.1;">New newsletter signup</h1>
      <p style="margin:0 0 16px;color:rgba(255,255,255,.78);">A new email joined the Mugen District drop list.</p>
      <div style="padding:14px 16px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);font-size:18px;font-weight:700;">
        ${email}
      </div>
    </div>
  `;
}

function newsletterCustomerHtml(email: string) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#050505;color:#fff;padding:24px;">
      <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.65);">Mugen District</div>
      <h1 style="margin:12px 0 8px;font-size:28px;line-height:1.1;">DROP SIGNAL CONFIRMED</h1>
      <p style="margin:0 0 12px;color:rgba(255,255,255,.82);">Early access. Password drops. Zero noise.</p>
      <p style="margin:0 0 12px;color:rgba(255,255,255,.7);">You're in with <strong>${email}</strong>. Watch your inbox.</p>
    </div>
  `;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = asString(body.email).toLowerCase();

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "That email looks corrupted. Try again." },
        { status: 400 }
      );
    }

    const adminEmail =
      asString(process.env.NEWSLETTER_NOTIFY_EMAIL) ||
      asString(process.env.ADMIN_ORDER_EMAIL);
    const resendDomainVerified = asBooleanFlag(process.env.RESEND_DOMAIN_VERIFIED);
    const customerAllowedInTestMode =
      !!adminEmail && email.toLowerCase() === adminEmail.toLowerCase();
    const shouldSendCustomer = resendDomainVerified || customerAllowedInTestMode;
    let confirmationSent = false;

    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: `DROP SIGNAL signup — ${email}`,
        html: newsletterAdminHtml(email),
        text: `New DROP SIGNAL signup: ${email}`,
        replyTo: email,
      });
    } else {
      console.log("[newsletter] signup", { email });
    }

    if (!shouldSendCustomer) {
      console.log(
        "[newsletter] customer confirmation skipped: domain not verified and recipient is not admin email"
      );
    } else {
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
            resend_domain_verified: resendDomainVerified,
          });
        } else {
          console.error(`[newsletter] customer confirmation failed: ${errorMessage(error)}`);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: confirmationSent ? "You're in. Watch your inbox." : "You're in.",
    });
  } catch (error) {
    if (error instanceof ResendRequestError) {
      console.error("[newsletter] resend request failed", {
        status: error.status,
        body: error.body,
        from: error.from,
        to: error.to,
        subject: error.subject,
      });
      return NextResponse.json(
        { ok: false, error: "Signup failed. Try again in a minute." },
        { status: 502 }
      );
    }

    const message = errorMessage(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
