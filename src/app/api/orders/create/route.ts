import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
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
};

type ValidatedLine = {
  productId: string;
  title: string;
  unitPriceCents: number;
  qty: number;
  size: string;
  currency: string;
  lineTotalCents: number;
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

  return { id, slug, title, priceCents, currency, isActive };
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
    .select("id,slug,title,price_cents,currency,status,is_active")
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
    errors: [] as string[],
  };

  const customerEmail = asString(params.shipping.email);
  const adminEmail = asString(process.env.ADMIN_ORDER_EMAIL);
  const forcedRecipient = adminEmail;

  const emailItems: EmailOrderItem[] = params.lines.map((line) => ({
    title: line.title,
    qty: line.qty,
    unitPriceCents: line.unitPriceCents,
    lineTotalCents: line.lineTotalCents,
    currency: line.currency,
    size: line.size,
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

  if (!forcedRecipient) {
    const message = "ADMIN_ORDER_EMAIL is empty; skipping all order emails.";
    result.errors.push(message);
    console.error(`[orders/create] ${message}`);
    return result;
  }

  if (customerEmail) {
    try {
      const customerTemplate = customerOrderEmail(payload);
      const customerResult = await sendEmail({
        to: forcedRecipient,
        subject: customerTemplate.subject,
        html: customerTemplate.html,
        text: customerTemplate.text,
      });
      result.customer = "sent";
      console.log(
        `[orders/create] resend customer status=${customerResult.status} id=${customerResult.id || "n/a"} routed_to=${forcedRecipient}`
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

  try {
    const adminTemplate = adminOrderEmail(payload);
    const adminResult = await sendEmail({
      to: forcedRecipient,
      subject: adminTemplate.subject,
      html: adminTemplate.html,
      text: adminTemplate.text,
    });
    result.admin = "sent";
    console.log(
      `[orders/create] resend admin status=${adminResult.status} id=${adminResult.id || "n/a"} routed_to=${forcedRecipient}`
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
    console.log("[orders/create] env_presence", {
      has_resend_api_key: Boolean(asString(process.env.RESEND_API_KEY)),
      has_resend_from_email: Boolean(asString(process.env.RESEND_FROM_EMAIL)),
      has_admin_order_email: Boolean(asString(process.env.ADMIN_ORDER_EMAIL)),
    });

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
        title: product.title,
        unitPriceCents: product.priceCents,
        qty,
        size: normalizeSize(item.size),
        currency: product.currency,
        lineTotalCents: product.priceCents * qty,
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

    const totalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
    if (!Number.isFinite(totalCents) || totalCents <= 0) {
      return NextResponse.json({ error: "Invalid order total." }, { status: 400 });
    }

    const currency = lines[0]?.currency || "GMD";
    const shippingAddress = formatAddress(shipping);
    const deliveryNote = asString(shipping.deliveryNote);

    const orderInsert = await supabaseAdmin
      .from("orders")
      .insert([
        {
          customer_name: asString(shipping.name),
          customer_email: asString(shipping.email),
          customer_phone: asString(shipping.phone),
          customer_address: shippingAddress,
          delivery_note: deliveryNote,
          total_cents: totalCents,
          currency,
          idempotency_key: idempotencyKey || null,
        },
      ])
      .select("id")
      .single();

    if (orderInsert.error) {
      const isIdempotencyConflict =
        /duplicate key/i.test(orderInsert.error.message) &&
        /idempotency/i.test(orderInsert.error.message);

      if (isIdempotencyConflict && idempotencyKey) {
        const duplicate = await findExistingOrderByIdempotencyKey(idempotencyKey);
        if (duplicate?.id) {
          const duplicateId = asString(duplicate.id);
          return NextResponse.json({
            ok: true,
            reused: true,
            order_id: duplicateId,
            order_ref: makeOrderRef(duplicateId),
            email_admin_sent: null,
            email_customer_sent: null,
            email_error: asString(duplicate.email_error) || null,
          });
        }
      }

      throw new Error(orderInsert.error.message);
    }

    const orderId = asString(orderInsert.data?.id);

    if (!orderId) {
      throw new Error("Order created without id.");
    }
    const orderRef = makeOrderRef(orderId);

    console.log(`[orders/create] inserted order id=${orderId} order_ref=${orderRef}`);

    const orderItemsInsert = await supabaseAdmin.from("order_items").insert(
      lines.map((line) => ({
        order_id: orderId,
        product_id: line.productId,
        title: line.title,
        price_cents: line.unitPriceCents,
        size: line.size,
        qty: line.qty,
      }))
    );

    if (orderItemsInsert.error) {
      throw new Error(orderItemsInsert.error.message);
    }

    console.log("[orders/create] email_env_presence", {
      resend_api_key: !!process.env.RESEND_API_KEY,
      resend_from_email: !!process.env.RESEND_FROM_EMAIL,
      admin_order_email: !!process.env.ADMIN_ORDER_EMAIL,
    });

    const emailResult = await sendOrderEmails({
      orderNumber: orderRef,
      shipping,
      shippingAddress,
      currency,
      totalCents,
      lines,
    });

    const emailAdminSent = emailResult.admin === "sent";
    const emailCustomerSent = emailResult.customer === "sent";
    const derivedEmailStatus =
      emailResult.errors.length === 0
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
