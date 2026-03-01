import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isLaunchLive } from "@/lib/launch";
import { LIMITED_STOCK_QTY } from "@/lib/products";
import {
  adminOrderEmail,
  customerOrderEmail,
  type EmailOrderItem,
} from "@/lib/email/templates";
import { ResendRequestError, sendEmail } from "@/lib/email/send";

export const runtime = "nodejs";

type IncomingItem = {
  id?: string;
  productId?: string;
  slug?: string;
  sku?: string;
  size?: string;
  qty?: number;
};

type IncomingShipping = {
  name?: string;
  email?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  deliveryNote?: string;
};

type ProductRow = {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  currency: string;
  isActive: boolean;
  isLimited: boolean;
  stockQty: number | null;
  soldQty: number;
  available: number | null;
};

type ValidatedLine = {
  productId: string;
  productSlug: string;
  title: string;
  unitPriceCents: number;
  qty: number;
  size: string;
  currency: string;
  lineTotalCents: number;
  isLimited: boolean;
  remainingQty: number | null;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function asBooleanFlag(value: unknown) {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function buildLaunchEnvPresence() {
  return {
    next_public_supabase_url: Boolean(asString(process.env.NEXT_PUBLIC_SUPABASE_URL)),
    next_public_supabase_anon_key: Boolean(asString(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)),
    supabase_url: Boolean(asString(process.env.SUPABASE_URL)),
    supabase_anon_key: Boolean(asString(process.env.SUPABASE_ANON_KEY)),
    supabase_service_role_key: Boolean(asString(process.env.SUPABASE_SERVICE_ROLE_KEY)),
    next_public_force_launch_live: Boolean(asString(process.env.NEXT_PUBLIC_FORCE_LAUNCH_LIVE)),
    force_launch_live: Boolean(asString(process.env.FORCE_LAUNCH_LIVE)),
    next_public_force_launch_live_until: Boolean(
      asString(process.env.NEXT_PUBLIC_FORCE_LAUNCH_LIVE_UNTIL)
    ),
    force_launch_live_until: Boolean(asString(process.env.FORCE_LAUNCH_LIVE_UNTIL)),
    resend_api_key: Boolean(asString(process.env.RESEND_API_KEY)),
    resend_from_email: Boolean(asString(process.env.RESEND_FROM_EMAIL)),
    admin_order_email: Boolean(asString(process.env.ADMIN_ORDER_EMAIL)),
    inventory_tracking_enabled: Boolean(asString(process.env.INVENTORY_TRACKING_ENABLED)),
    resend_domain_verified: Boolean(asString(process.env.RESEND_DOMAIN_VERIFIED)),
  };
}

function normalizePriceCents(row: Record<string, unknown>) {
  const cents = asNumber(row.price_cents);
  if (Number.isFinite(cents)) return Math.round(cents);

  const major = asNumber(row.price);
  if (Number.isFinite(major)) return Math.round(major * 100);

  return NaN;
}

function normalizeProduct(row: Record<string, unknown>): ProductRow | null {
  const id = asString(row.id);
  if (!id) return null;

  const slug = asString(row.slug) || asString(row.sku) || id;
  const title =
    asString(row.title) ||
    asString(row.name) ||
    asString(row.product_name) ||
    slug;
  const priceCents = normalizePriceCents(row);

  if (!title || !Number.isFinite(priceCents) || priceCents <= 0) {
    return null;
  }

  const currency = (asString(row.currency) || "GMD").toUpperCase();
  const status = asString(row.status).toUpperCase();
  const isActiveRaw = row.is_active;
  const isActive =
    isActiveRaw === undefined || isActiveRaw === null
      ? status !== "ARCHIVED" && status !== "INACTIVE"
      : Boolean(isActiveRaw);
  const isLimitedRaw = row.is_limited;
  const isLimited =
    typeof isLimitedRaw === "boolean" ? isLimitedRaw : status === "LIMITED";
  const stockQtyRaw = asNumber(row.stock_qty);
  const stockQty = isLimited
    ? Number.isFinite(stockQtyRaw)
      ? Math.max(0, Math.floor(stockQtyRaw))
      : LIMITED_STOCK_QTY
    : null;
  const soldQtyRaw = asNumber(row.sold_qty);
  const soldQty = Number.isFinite(soldQtyRaw) ? Math.max(0, Math.floor(soldQtyRaw)) : 0;
  const available = isLimited && stockQty !== null ? Math.max(0, stockQty - soldQty) : null;

  return { id, slug, title, priceCents, currency, isActive, isLimited, stockQty, soldQty, available };
}

function formatAddress(shipping: IncomingShipping) {
  const lines = [
    asString(shipping.address1),
    asString(shipping.address2),
    [asString(shipping.city), asString(shipping.region)]
      .filter(Boolean)
      .join(", "),
    asString(shipping.postalCode),
    asString(shipping.country),
  ].filter(Boolean);

  return lines.join("\n");
}

function normalizeIncomingRef(item: IncomingItem) {
  return (
    asString(item.productId) ||
    asString(item.id) ||
    asString(item.slug) ||
    asString(item.sku)
  );
}

function normalizeSize(size: unknown) {
  const value = asString(size).toUpperCase();
  if (!value) return "M";
  return value.slice(0, 10);
}

function isShippingValid(shipping: IncomingShipping) {
  return Boolean(
    asString(shipping.name) &&
      asString(shipping.email) &&
      asString(shipping.phone) &&
      asString(shipping.address1) &&
      asString(shipping.city) &&
      asString(shipping.country)
  );
}

function makeOrderRef(orderId: string) {
  const token = orderId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
  return `MGN-${token || "00000000"}`;
}

async function fetchProductsFromSupabase() {
  const primary = await supabaseAdmin
    .from("products")
    .select("id,slug,title,price_cents,currency,status,is_active,is_limited,stock_qty,sold_qty")
    .order("created_at", { ascending: false });

  if (!primary.error) {
    return primary.data || [];
  }

  const fallback = await supabaseAdmin.from("products").select("*");
  if (fallback.error) {
    throw new Error(fallback.error.message);
  }

  return fallback.data || [];
}

function buildProductLookup(rows: Record<string, unknown>[]) {
  const byRef = new Map<string, ProductRow>();

  rows
    .map((row) => normalizeProduct(row))
    .filter((row): row is ProductRow => Boolean(row))
    .forEach((product) => {
      byRef.set(product.id.toLowerCase(), product);
      byRef.set(product.slug.toLowerCase(), product);
    });

  return byRef;
}

function parseOutOfStockMessage(message: string) {
  if (!message.includes("OUT_OF_STOCK:")) return "";
  return message.split("OUT_OF_STOCK:")[1]?.trim() || "Insufficient stock.";
}

async function findExistingOrderByIdempotencyKey(idempotencyKey: string) {
  const query = await supabaseAdmin
    .from("orders")
    .select("id,email_status,email_error")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (query.error) {
    throw new Error(query.error.message);
  }

  return query.data;
}

async function sendOrderEmails(params: {
  orderNumber: string;
  shipping: IncomingShipping;
  shippingAddress: string;
  currency: string;
  totalCents: number;
  lines: ValidatedLine[];
}) {
  const result = {
    customer: "skipped" as "sent" | "failed" | "skipped",
    admin: "skipped" as "sent" | "failed" | "skipped",
    customerSkippedByPolicy: false,
    errors: [] as string[],
  };

  const customerEmail = asString(params.shipping.email);
  const adminEmail = asString(process.env.ADMIN_ORDER_EMAIL);
  const resendDomainVerified = asBooleanFlag(process.env.RESEND_DOMAIN_VERIFIED);
  // In Resend test mode, you can only send to your own email until domain verification is complete.
  const customerAllowedInTestMode =
    !!customerEmail &&
    !!adminEmail &&
    customerEmail.toLowerCase() === adminEmail.toLowerCase();
  const shouldSendCustomer =
    !!customerEmail && (resendDomainVerified || customerAllowedInTestMode);

  const emailItems: EmailOrderItem[] = params.lines.map((line) => ({
    title: line.title,
    qty: line.qty,
    unitPriceCents: line.unitPriceCents,
    lineTotalCents: line.lineTotalCents,
    currency: line.currency,
    size: line.size,
    limited: line.isLimited,
    remainingQty: line.remainingQty,
  }));

  const payload = {
    orderNumber: params.orderNumber,
    currency: params.currency,
    totalCents: params.totalCents,
    customerName: asString(params.shipping.name),
    customerEmail,
    customerPhone: asString(params.shipping.phone),
    shippingAddress: params.shippingAddress,
    deliveryNote: asString(params.shipping.deliveryNote),
    items: emailItems,
  };

  console.log("[orders/create] email_policy", {
    resend_domain_verified: resendDomainVerified,
    has_customer_email: Boolean(customerEmail),
    has_admin_order_email: Boolean(adminEmail),
  });

  if (customerEmail && !shouldSendCustomer) {
    result.customerSkippedByPolicy = true;
    console.log(
      "[orders/create] customer email skipped: domain not verified and recipient is not admin email (Resend test-mode restriction)"
    );
  }

  if (shouldSendCustomer) {
    try {
      const customerTemplate = customerOrderEmail(payload);
      const customerResult = await sendEmail({
        to: customerEmail,
        subject: customerTemplate.subject,
        html: customerTemplate.html,
        text: customerTemplate.text,
      });
      result.customer = "sent";
      console.log(
        `[orders/create] resend customer status=${customerResult.status} id=${customerResult.id || "n/a"} to=${customerEmail}`
      );
    } catch (error) {
      result.customer = "failed";
      const message = errorMessage(error);
      result.errors.push(`customer: ${message}`);
      console.error(`[orders/create] resend customer error=${message}`);
      if (error instanceof ResendRequestError) {
        console.error("[orders/create] resend customer failure payload", {
          status: error.status,
          body: error.body,
          from: error.from,
          to: error.to,
          subject: error.subject,
        });
      }
    }
  }

  if (!adminEmail) {
    const message = "ADMIN_ORDER_EMAIL is empty; skipping admin order email.";
    result.errors.push(message);
    console.error(`[orders/create] ${message}`);
    return result;
  }

  try {
    const adminTemplate = adminOrderEmail(payload);
    const adminResult = await sendEmail({
      to: adminEmail,
      subject: adminTemplate.subject,
      html: adminTemplate.html,
      text: adminTemplate.text,
    });
    result.admin = "sent";
    console.log(
      `[orders/create] resend admin status=${adminResult.status} id=${adminResult.id || "n/a"} to=${adminEmail}`
    );
  } catch (error) {
    result.admin = "failed";
    const message = errorMessage(error);
    result.errors.push(`admin: ${message}`);
    console.error(`[orders/create] resend admin error=${message}`);
    if (error instanceof ResendRequestError) {
      console.error("[orders/create] resend admin failure payload", {
        status: error.status,
        body: error.body,
        from: error.from,
        to: error.to,
        subject: error.subject,
      });
    }
  }

  return result;
}

export async function POST(request: Request) {
  try {
    console.log("[orders/create] env_presence", buildLaunchEnvPresence());

    if (!isLaunchLive()) {
      return NextResponse.json(
        { error: "LOCKED — Opens April 1" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      shipping?: IncomingShipping;
      cart?: IncomingItem[];
      items?: IncomingItem[];
      idempotencyKey?: string;
    };

    const shipping = body.shipping || {};
    const cart = Array.isArray(body.cart)
      ? body.cart
      : Array.isArray(body.items)
        ? body.items
        : [];

    const idempotencyKey =
      asString(request.headers.get("Idempotency-Key")) || asString(body.idempotencyKey);

    if (idempotencyKey && idempotencyKey.length > 120) {
      return NextResponse.json(
        { error: "Invalid idempotency key." },
        { status: 400 }
      );
    }

    if (!isShippingValid(shipping)) {
      return NextResponse.json(
        { error: "Missing required shipping fields." },
        { status: 400 }
      );
    }

    if (!Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    }

    if (idempotencyKey) {
      const existingOrder = await findExistingOrderByIdempotencyKey(idempotencyKey);
      if (existingOrder?.id) {
        const existingId = asString(existingOrder.id);

        return NextResponse.json({
          ok: true,
          reused: true,
          order_id: existingId,
          order_ref: makeOrderRef(existingId),
          email_status: asString(existingOrder.email_status) || null,
          email_admin_sent: null,
          email_customer_sent: null,
          email_error: asString(existingOrder.email_error) || null,
        });
      }
    }

    const productRows = (await fetchProductsFromSupabase()) as Record<string, unknown>[];
    const productLookup = buildProductLookup(productRows);

    const lines: ValidatedLine[] = [];
    const invalidRefs: string[] = [];

    for (const item of cart) {
      const ref = normalizeIncomingRef(item).toLowerCase();
      const qty = Math.floor(asNumber(item.qty));

      if (!ref || !Number.isFinite(qty) || qty < 1) {
        invalidRefs.push(ref || "(missing product_id)");
        continue;
      }

      const product = productLookup.get(ref);
      if (!product || !product.isActive) {
        invalidRefs.push(ref);
        continue;
      }

      lines.push({
        productId: product.id,
        productSlug: product.slug,
        title: product.title,
        unitPriceCents: product.priceCents,
        qty,
        size: normalizeSize(item.size),
        currency: product.currency,
        lineTotalCents: product.priceCents * qty,
        isLimited: product.isLimited,
        remainingQty: product.isLimited && product.available !== null ? product.available - qty : null,
      });
    }

    if (invalidRefs.length > 0) {
      const failedRefs = Array.from(new Set(invalidRefs));
      return NextResponse.json(
        {
          error: `Invalid product IDs: ${failedRefs.join(", ")}`,
          invalid_product_ids: failedRefs,
        },
        { status: 400 }
      );
    }

    const insufficientLine = lines.find(
      (line) => line.isLimited && line.remainingQty !== null && line.remainingQty < 0
    );

    if (insufficientLine) {
      return NextResponse.json(
        {
          error: `Insufficient stock for ${insufficientLine.title}`,
          code: "OUT_OF_STOCK",
        },
        { status: 409 }
      );
    }

    const totalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
    if (!Number.isFinite(totalCents) || totalCents <= 0) {
      return NextResponse.json({ error: "Invalid order total." }, { status: 400 });
    }

    const currency = lines[0]?.currency || "GMD";
    const shippingAddress = formatAddress(shipping);
    const deliveryNote = asString(shipping.deliveryNote);

    const orderCreate = await supabaseAdmin.rpc("create_manual_order_with_inventory", {
      p_customer_name: asString(shipping.name),
      p_customer_email: asString(shipping.email),
      p_customer_phone: asString(shipping.phone),
      p_customer_address: shippingAddress,
      p_delivery_note: deliveryNote || null,
      p_currency: currency,
      p_total_cents: totalCents,
      p_idempotency_key: idempotencyKey || null,
      p_items: lines.map((line) => ({
        product_id: line.productId,
        product_slug: line.productSlug,
        title: line.title,
        price_cents: line.unitPriceCents,
        qty: line.qty,
        size: line.size,
        currency: line.currency,
      })),
    });

    if (orderCreate.error) {
      const outOfStockMessage = parseOutOfStockMessage(orderCreate.error.message);
      if (outOfStockMessage) {
        return NextResponse.json(
          { error: outOfStockMessage, code: "OUT_OF_STOCK" },
          { status: 409 }
        );
      }

      const isIdempotencyConflict =
        /duplicate key/i.test(orderCreate.error.message) &&
        /idempotency/i.test(orderCreate.error.message);

      if (isIdempotencyConflict && idempotencyKey) {
        const duplicate = await findExistingOrderByIdempotencyKey(idempotencyKey);
        if (duplicate?.id) {
          const duplicateId = asString(duplicate.id);
          return NextResponse.json({
            ok: true,
            reused: true,
            order_id: duplicateId,
            order_ref: makeOrderRef(duplicateId),
            email_status: asString(duplicate.email_status) || null,
            email_admin_sent: null,
            email_customer_sent: null,
            email_error: asString(duplicate.email_error) || null,
          });
        }
      }

      throw new Error(orderCreate.error.message);
    }

    const rpcRow = Array.isArray(orderCreate.data) ? orderCreate.data[0] : null;
    const orderId = asString(rpcRow?.order_id);
    const reusedOrder = Boolean(rpcRow?.reused);

    if (!orderId) {
      throw new Error("Order created without id.");
    }
    const orderRef = makeOrderRef(orderId);

    if (reusedOrder && idempotencyKey) {
      const existingOrder = await findExistingOrderByIdempotencyKey(idempotencyKey);
      return NextResponse.json({
        ok: true,
        reused: true,
        order_id: orderId,
        order_ref: orderRef,
        email_status: asString(existingOrder?.email_status) || null,
        email_admin_sent: null,
        email_customer_sent: null,
        email_error: asString(existingOrder?.email_error) || null,
      });
    }

    console.log(`[orders/create] inserted order id=${orderId} order_ref=${orderRef}`);
    const refreshedProductRows = (await fetchProductsFromSupabase()) as Record<string, unknown>[];
    const refreshedLookup = buildProductLookup(refreshedProductRows);
    const emailLines = lines.map((line) => {
      const refreshed =
        refreshedLookup.get(line.productId.toLowerCase()) ||
        refreshedLookup.get(line.productSlug.toLowerCase());

      return {
        ...line,
        remainingQty:
          refreshed?.isLimited && refreshed.available !== null ? refreshed.available : line.remainingQty,
      };
    });

    console.log("[orders/create] email_env_presence", {
      resend_api_key: !!process.env.RESEND_API_KEY,
      resend_from_email: !!process.env.RESEND_FROM_EMAIL,
      admin_order_email: !!process.env.ADMIN_ORDER_EMAIL,
      resend_domain_verified: !!process.env.RESEND_DOMAIN_VERIFIED,
    });

    let emailResult: Awaited<ReturnType<typeof sendOrderEmails>> = {
      customer: "skipped",
      admin: "skipped",
      customerSkippedByPolicy: false,
      errors: [],
    };

    try {
      emailResult = await sendOrderEmails({
        orderNumber: orderRef,
        shipping,
        shippingAddress,
        currency,
        totalCents,
        lines: emailLines,
      });
    } catch (error) {
      const message = errorMessage(error);
      emailResult = {
        customer: "failed",
        admin: "failed",
        customerSkippedByPolicy: false,
        errors: [`unexpected_email_error: ${message}`],
      };
      console.error(`[orders/create] unexpected email pipeline error=${message}`);
    }

    const emailAdminSent = emailResult.admin === "sent";
    const emailCustomerSent = emailResult.customer === "sent";
    const derivedEmailStatus =
      emailAdminSent && emailResult.customerSkippedByPolicy
        ? "admin_sent_customer_skipped"
        : emailResult.errors.length === 0
          ? "sent"
          : emailCustomerSent || emailAdminSent
            ? "partial"
            : "failed";
    const emailError = emailResult.errors.length ? emailResult.errors.join(" | ") : null;
    const warning = emailError
      ? "Order was created but one or more emails failed to send."
      : null;

    console.log(
      `[orders/create] email_status=${derivedEmailStatus} customer=${emailResult.customer} admin=${emailResult.admin}`
    );

    // Optional metadata update; failures here must not block the response.
    const emailMetaUpdate = await supabaseAdmin
      .from("orders")
      .update({
        email_status: derivedEmailStatus,
        email_error: emailError,
      })
      .eq("id", orderId);

    if (emailMetaUpdate.error) {
      console.error(
        `[orders/create] email metadata update skipped: ${emailMetaUpdate.error.message}`
      );
    }

    return NextResponse.json({
      ok: true,
      order_id: orderId,
      order_ref: orderRef,
      email_status: derivedEmailStatus,
      email_admin_sent: emailAdminSent,
      email_customer_sent: emailCustomerSent,
      email_error: emailError,
      warning,
    });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error) },
      { status: 500 }
    );
  }
}
