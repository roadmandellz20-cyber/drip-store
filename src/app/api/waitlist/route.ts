import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_SOURCES = new Set(["store", "product"]);
const RATE_LIMIT_WINDOW_MS = 20_000;
const waitlistIpLog = new Map<string, number>();

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getClientIp(request: Request) {
  const forwardedFor = asString(request.headers.get("x-forwarded-for"));
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const realIp = asString(request.headers.get("x-real-ip"));
  return realIp || "unknown";
}

function isRateLimited(ip: string, now = Date.now()) {
  waitlistIpLog.forEach((timestamp, key) => {
    if (now - timestamp > RATE_LIMIT_WINDOW_MS) {
      waitlistIpLog.delete(key);
    }
  });

  const previous = waitlistIpLog.get(ip);
  if (previous && now - previous < RATE_LIMIT_WINDOW_MS) {
    return true;
  }

  waitlistIpLog.set(ip, now);
  return false;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      contact?: string;
      source?: string;
      productSku?: string | null;
    };

    const contact = asString(body.contact).toLowerCase();
    const source = asString(body.source).toLowerCase();
    const productSku = asString(body.productSku);

    if (!EMAIL_RE.test(contact)) {
      return NextResponse.json({ ok: false, error: "Enter a valid email." }, { status: 400 });
    }

    if (!ALLOWED_SOURCES.has(source)) {
      return NextResponse.json({ ok: false, error: "Invalid archive source." }, { status: 400 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { ok: false, error: "Hold for a moment before hitting the archive again." },
        { status: 429 }
      );
    }

    const { error } = await supabaseAdmin.from("waitlist").insert({
      contact,
      source,
      product_sku: productSku || null,
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Waitlist signup failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
