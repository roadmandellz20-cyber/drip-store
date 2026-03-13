import { NextResponse } from "next/server";
import {
  sanitizeEmailInput,
  sanitizeIpInput,
  sanitizeSingleLineInput,
  sanitizeSlugInput,
} from "@/lib/input";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRODUCT_SKU_RE = /^[a-z0-9-]{1,64}$/;
const ALLOWED_SOURCES = new Set(["store", "product"]);
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;

type IpRateLimitEntry = {
  count: number;
  resetAt: number;
};

const waitlistIpLog = new Map<string, IpRateLimitEntry>();

function asString(value: unknown) {
  return sanitizeSingleLineInput(value);
}

async function loadSupabaseAdmin() {
  const mod = await import("@/lib/supabase-admin");
  return mod.supabaseAdmin;
}

function normalizeIp(ip: string) {
  return sanitizeIpInput(ip);
}

function getClientIp(request: Request) {
  const forwardedFor = asString(request.headers.get("x-forwarded-for"));
  if (forwardedFor) {
    return normalizeIp(forwardedFor.split(",")[0] || "");
  }

  const realIp = asString(request.headers.get("x-real-ip"));
  return normalizeIp(realIp || "unknown");
}

function isRateLimited(ip: string, now = Date.now()) {
  waitlistIpLog.forEach((entry, key) => {
    if (entry.resetAt <= now) {
      waitlistIpLog.delete(key);
    }
  });

  const entry = waitlistIpLog.get(ip);
  if (!entry) {
    waitlistIpLog.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  entry.count += 1;
  return false;
}

function isValidContact(contact: string) {
  return contact.length > 3 && contact.length <= 254 && EMAIL_RE.test(contact);
}

function isValidProductSku(productSku: string) {
  if (!productSku) return true;
  return PRODUCT_SKU_RE.test(productSku);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      contact?: string;
      source?: string;
      productSku?: string | null;
    };

    const contact = sanitizeEmailInput(body.contact);
    const source = sanitizeSingleLineInput(body.source, {
      lowercase: true,
      maxLength: 32,
    });
    const productSku = sanitizeSlugInput(body.productSku, 64);

    if (!isValidContact(contact)) {
      return NextResponse.json({ ok: false, error: "Enter a valid email." }, { status: 400 });
    }

    if (!ALLOWED_SOURCES.has(source)) {
      return NextResponse.json({ ok: false, error: "Invalid archive source." }, { status: 400 });
    }

    if (!isValidProductSku(productSku)) {
      return NextResponse.json({ ok: false, error: "Invalid product SKU." }, { status: 400 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { ok: false, error: "Hold for a moment before hitting the archive again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)),
          },
        }
      );
    }

    const supabaseAdmin = await loadSupabaseAdmin();

    const { error } = await supabaseAdmin.from("waitlist").insert({
      contact,
      source,
      product_sku: productSku || null,
    });

    if (error) {
      console.error("[waitlist] insert failed", error);
      return NextResponse.json({ ok: false, error: "Waitlist signup failed." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[waitlist] request failed", error);
    return NextResponse.json({ ok: false, error: "Waitlist signup failed." }, { status: 500 });
  }
}
