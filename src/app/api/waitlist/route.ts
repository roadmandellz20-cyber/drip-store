import { NextResponse } from "next/server";
import {
  sanitizeEmailInput,
  sanitizeSingleLineInput,
  sanitizeSlugInput,
} from "@/lib/input";
import {
  consumeRequestRateLimit,
  rateLimitJsonResponse,
} from "@/lib/request-rate-limit";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRODUCT_SKU_RE = /^[a-z0-9-]{1,64}$/;
const ALLOWED_SOURCES = new Set(["store", "product"]);
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 5;
const WAITLIST_RATE_LIMIT = {
  scope: "waitlist-signup",
  windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
  maxRequests: RATE_LIMIT_MAX_REQUESTS,
  blockSeconds: 5 * 60,
} as const;

function asString(value: unknown) {
  return sanitizeSingleLineInput(value);
}

async function loadSupabaseAdmin() {
  const mod = await import("@/lib/supabase-admin");
  return mod.supabaseAdmin;
}

function isValidContact(contact: string) {
  return contact.length > 3 && contact.length <= 254 && EMAIL_RE.test(contact);
}

function isValidProductSku(productSku: string) {
  if (!productSku) return true;
  return PRODUCT_SKU_RE.test(productSku);
}

function isUniqueViolation(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      asString((error as { code?: unknown }).code) === "23505"
  );
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

    const rateLimit = await consumeRequestRateLimit(WAITLIST_RATE_LIMIT, request, {
      keyParts: [source],
    });
    if (!rateLimit.allowed) {
      return rateLimitJsonResponse(
        "Hold for a moment before hitting the archive again.",
        rateLimit.retryAfterSeconds
      );
    }

    const supabaseAdmin = await loadSupabaseAdmin();

    const { error } = await supabaseAdmin.from("waitlist").insert({
      contact,
      source,
      product_sku: productSku || null,
    });

    if (error) {
      if (isUniqueViolation(error)) {
        return NextResponse.json({ ok: true });
      }
      console.error("[waitlist] insert failed", error);
      return NextResponse.json({ ok: false, error: "Waitlist signup failed." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[waitlist] request failed", error);
    return NextResponse.json({ ok: false, error: "Waitlist signup failed." }, { status: 500 });
  }
}
