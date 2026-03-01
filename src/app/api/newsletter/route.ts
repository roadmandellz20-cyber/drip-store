import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/send";
import { getSiteUrl } from "@/lib/site";

export const runtime = "nodejs";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

    if ((process.env.RESEND_DOMAIN_VERIFIED || "").trim().toLowerCase() === "true") {
      const unsubscribeAddress =
        asString(process.env.RESEND_REPLY_TO) ||
        adminEmail ||
        "support@mugendistrict.com";

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
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Newsletter signup failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
