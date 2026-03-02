import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isLaunchLive } from "@/lib/launch";
import { LIMITED_STOCK_QTY } from "@/lib/products";
import {
  adminOrderEmail,
  type EmailOrderItem,
  type OrderEmailPayload,
} from "@/lib/email/templates";
import {
  ResendRequestError,
  sendCustomerOrderConfirmation,
  sendEmail,
} from "@/lib/email/send";
import {
  deriveAggregateEmailStatus,
  isBasicCustomerEmail,
  normalizeDeliveryStatus,
  shouldSendCustomerConfirmation,
  type DeliveryStatus,
} from "@/lib/orders/email-state";

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

type ExistingOrderRow = {
  id: string;
  emailStatus: string;
  emailError: string;
  customerEmail: string;
  customerEmailStatus: string;
  customerEmailError: string;
  customerEmailSentAt: string;
};

type OrderEmailContext = {
  orderId: string;
  orderRef: string;
  payload: OrderEmailPayload;
  customerEmailStatus: string;
  customerEmailError: string;
  customerEmailSentAt: string;
  emailStatus: string;
  emailError: string;
};

type CustomerEmailResult = {
  status: DeliveryStatus;
  error: string | null;
  sentAt: string | null;
};

type OrderEmailResult = {
  customer: CustomerEmailResult;
  adminStatus: DeliveryStatus;
  adminError: string | null;
  errors: string[];
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMissingCustomerEmailStateColumnError(message: string) {
  return /customer_email_(status|error|sent_at)/i.test(message);
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
    resend_customer_from_email: Boolean(asString(process.env.RESEND_CUSTOMER_FROM_EMAIL)),
    admin_order_email: Boolean(asString(process.env.ADMIN_ORDER_EMAIL)),
    inventory_tracking_enabled: Boolean(asString(process.env.INVENTORY_TRACKING_ENABLED)),
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
  const primary = await supabaseAdmin
    .from("orders")
    .select(
      "id,customer_email,email_status,email_error,customer_email_status,customer_email_error,customer_email_sent_at"
    )
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  const query =
    primary.error && isMissingCustomerEmailStateColumnError(primary.error.message)
      ? await supabaseAdmin
          .from("orders")
          .select("id,customer_email,email_status,email_error")
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle()
      : primary;

  if (query.error) {
    throw new Error(query.error.message);
  }

  if (!query.data || !isRecord(query.data)) {
    return null;
  }
  const row = query.data as Record<string, unknown>;
  const emailStatus = asString(row.email_status);
  const customerEmailStatus =
    asString(row.customer_email_status) ||
    (emailStatus.toLowerCase() === "sent" ? "sent" : "");

  return {
    id: asString(row.id),
    emailStatus,
    emailError: asString(row.email_error),
    customerEmail: asString(row.customer_email),
    customerEmailStatus,
    customerEmailError: asString(row.customer_email_error),
    customerEmailSentAt: asString(row.customer_email_sent_at),
  } satisfies ExistingOrderRow;
}

function buildOrderResponse(args: {
  orderId: string;
  reused?: boolean;
  emailStatus?: string | null;
  emailError?: string | null;
  emailAdminSent?: boolean | null;
  emailCustomerSent?: boolean | null;
  customerEmailStatus?: string | null;
  customerEmailError?: string | null;
  customerEmailSentAt?: string | null;
  warning?: string | null;
}) {
  return {
    ok: true,
    reused: Boolean(args.reused),
    order_id: args.orderId,
    order_ref: makeOrderRef(args.orderId),
    email_status: args.emailStatus || null,
    email_admin_sent: args.emailAdminSent ?? null,
    email_customer_sent: args.emailCustomerSent ?? null,
    email_error: args.emailError || null,
    customer_email_status: args.customerEmailStatus || null,
    customer_email_error: args.customerEmailError || null,
    customer_email_sent_at: args.customerEmailSentAt || null,
    warning: args.warning || null,
  };
}

function buildEmailItemsFromLines(lines: ValidatedLine[]): EmailOrderItem[] {
  return lines.map((line) => ({
    title: line.title,
    sku: line.productSlug,
    qty: line.qty,
    unitPriceCents: line.unitPriceCents,
    lineTotalCents: line.lineTotalCents,
    currency: line.currency,
    size: line.size,
    limited: line.isLimited,
    remainingQty: line.remainingQty,
  }));
}

function buildOrderEmailPayload(args: {
  orderRef: string;
  shipping: IncomingShipping;
  shippingAddress: string;
  currency: string;
  totalCents: number;
  items: EmailOrderItem[];
}): OrderEmailPayload {
  return {
    orderNumber: args.orderRef,
    currency: args.currency,
    totalCents: args.totalCents,
    customerName: asString(args.shipping.name),
    customerEmail: asString(args.shipping.email),
    customerPhone: asString(args.shipping.phone),
    shippingAddress: args.shippingAddress,
    deliveryNote: asString(args.shipping.deliveryNote),
    items: args.items,
  };
}

async function loadOrderEmailContext(orderId: string): Promise<OrderEmailContext> {
  const [primaryOrderQuery, itemsQuery] = await Promise.all([
    supabaseAdmin
      .from("orders")
      .select(
        "id,customer_name,customer_email,customer_phone,customer_address,delivery_note,total_cents,currency,email_status,email_error,customer_email_status,customer_email_error,customer_email_sent_at"
      )
      .eq("id", orderId)
      .maybeSingle(),
    supabaseAdmin
      .from("order_items")
      .select("product_slug,title,qty,size,unit_price_cents,price_cents,line_total_cents,currency")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
  ]);

  const orderQuery =
    primaryOrderQuery.error && isMissingCustomerEmailStateColumnError(primaryOrderQuery.error.message)
      ? await supabaseAdmin
          .from("orders")
          .select(
            "id,customer_name,customer_email,customer_phone,customer_address,delivery_note,total_cents,currency,email_status,email_error"
          )
          .eq("id", orderId)
          .maybeSingle()
      : primaryOrderQuery;

  if (orderQuery.error) {
    throw new Error(orderQuery.error.message);
  }
  if (!orderQuery.data || !isRecord(orderQuery.data)) {
    throw new Error("Order email context not found.");
  }
  if (itemsQuery.error) {
    throw new Error(itemsQuery.error.message);
  }
  const orderRow = orderQuery.data as Record<string, unknown>;

  const orderCurrency = (asString(orderRow.currency) || "GMD").toUpperCase();
  const items = ((itemsQuery.data as Array<Record<string, unknown>> | null) || [])
    .map((row): EmailOrderItem | null => {
      const title = asString(row.title);
      const qty = Math.max(1, Math.floor(asNumber(row.qty)));
      const unitPriceCents = Math.round(asNumber(row.unit_price_cents) || asNumber(row.price_cents));
      const lineTotalCents = Math.round(asNumber(row.line_total_cents) || unitPriceCents * qty);

      if (!title || !Number.isFinite(unitPriceCents) || unitPriceCents <= 0) {
        return null;
      }

      return {
        title,
        sku: asString(row.product_slug),
        qty,
        unitPriceCents,
        lineTotalCents,
        currency: (asString(row.currency) || orderCurrency).toUpperCase(),
        size: normalizeSize(row.size),
      } satisfies EmailOrderItem;
    })
    .filter((item): item is EmailOrderItem => item !== null);

  const shipping: IncomingShipping = {
    name: asString(orderRow.customer_name),
    email: asString(orderRow.customer_email),
    phone: asString(orderRow.customer_phone),
    deliveryNote: asString(orderRow.delivery_note),
  };
  const shippingAddress = asString(orderRow.customer_address);
  const emailStatus = asString(orderRow.email_status);
  const customerEmailStatus =
    asString(orderRow.customer_email_status) ||
    (emailStatus.toLowerCase() === "sent" ? "sent" : "");

  return {
    orderId,
    orderRef: makeOrderRef(orderId),
    payload: buildOrderEmailPayload({
      orderRef: makeOrderRef(orderId),
      shipping,
      shippingAddress,
      currency: orderCurrency,
      totalCents: Math.round(asNumber(orderRow.total_cents)),
      items,
    }),
    emailStatus,
    emailError: asString(orderRow.email_error),
    customerEmailStatus,
    customerEmailError: asString(orderRow.customer_email_error),
    customerEmailSentAt: asString(orderRow.customer_email_sent_at),
  };
}

async function persistCustomerEmailState(orderId: string, result: CustomerEmailResult) {
  const query = await supabaseAdmin
    .from("orders")
    .update({
      customer_email_status: result.status,
      customer_email_error: result.error,
      customer_email_sent_at: result.sentAt,
    })
    .eq("id", orderId);

  if (query.error) {
    if (isMissingCustomerEmailStateColumnError(query.error.message)) {
      console.error(
        "[orders/create] customer email metadata update skipped: missing customer email columns. Run 20260302_customer_order_email_state.sql."
      );
      return;
    }
    console.error(`[orders/create] customer email metadata update skipped: ${query.error.message}`);
  }
}

async function sendCustomerConfirmationForOrder(args: {
  orderId: string;
  payload: OrderEmailPayload;
  existingStatus?: string;
  existingError?: string;
  existingSentAt?: string;
}) {
  const customerEmail = asString(args.payload.customerEmail);

  if (!isBasicCustomerEmail(customerEmail)) {
    const result: CustomerEmailResult = {
      status: "skipped",
      error: customerEmail ? "Invalid customer email address." : null,
      sentAt: null,
    };
    await persistCustomerEmailState(args.orderId, result);
    if (result.error) {
      console.warn("[orders/create] customer email skipped: invalid email", {
        order_id: args.orderId,
        customer_email: customerEmail,
      });
    }
    return result;
  }

  if (
    !shouldSendCustomerConfirmation({
      customerEmail,
      customerEmailStatus: args.existingStatus,
      customerEmailSentAt: args.existingSentAt,
    })
  ) {
    return {
      status: "sent",
      error: args.existingError || null,
      sentAt: args.existingSentAt || null,
    } satisfies CustomerEmailResult;
  }

  try {
    const customerResult = await sendCustomerOrderConfirmation({
      to: customerEmail,
      payload: args.payload,
    });
    const result: CustomerEmailResult = {
      status: "sent",
      error: null,
      sentAt: new Date().toISOString(),
    };
    await persistCustomerEmailState(args.orderId, result);
    console.log(
      `[orders/create] resend customer status=${customerResult.status} id=${customerResult.id || "n/a"} to=${customerEmail}`
    );
    return result;
  } catch (error) {
    const message = errorMessage(error);
    const result: CustomerEmailResult = {
      status: "failed",
      error: message,
      sentAt: null,
    };
    await persistCustomerEmailState(args.orderId, result);
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
    return result;
  }
}

async function ensureCustomerConfirmationForExistingOrder(orderId: string) {
  const context = await loadOrderEmailContext(orderId);
  const wasAlreadySent =
    normalizeDeliveryStatus(context.customerEmailStatus) === "sent" ||
    Boolean(context.customerEmailSentAt);
  const customer = await sendCustomerConfirmationForOrder({
    orderId,
    payload: context.payload,
    existingStatus: context.customerEmailStatus,
    existingError: context.customerEmailError,
    existingSentAt: context.customerEmailSentAt,
  });

  return {
    context,
    customer,
    customerSentNow: customer.status === "sent" && !wasAlreadySent,
  };
}

async function sendOrderEmails(params: {
  orderId: string;
  orderNumber: string;
  shipping: IncomingShipping;
  shippingAddress: string;
  currency: string;
  totalCents: number;
  lines: ValidatedLine[];
}) {
  const result: OrderEmailResult = {
    customer: {
      status: "skipped",
      error: null,
      sentAt: null,
    },
    adminStatus: "skipped",
    adminError: null,
    errors: [] as string[],
  };

  const adminEmail = asString(process.env.ADMIN_ORDER_EMAIL);
  const emailItems = buildEmailItemsFromLines(params.lines);
  const payload = buildOrderEmailPayload({
    orderRef: params.orderNumber,
    shipping: params.shipping,
    shippingAddress: params.shippingAddress,
    currency: params.currency,
    totalCents: params.totalCents,
    items: emailItems,
  });

  console.log("[orders/create] email_policy", {
    has_customer_email: Boolean(asString(params.shipping.email)),
    has_admin_order_email: Boolean(adminEmail),
  });

  result.customer = await sendCustomerConfirmationForOrder({
    orderId: params.orderId,
    payload,
  });
  if (result.customer.error) {
    result.errors.push(`customer: ${result.customer.error}`);
  }

  if (!adminEmail) {
    const message = "ADMIN_ORDER_EMAIL is empty; skipping admin order email.";
    result.adminStatus = "failed";
    result.adminError = message;
    result.errors.push(`admin: ${message}`);
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
    result.adminStatus = "sent";
    console.log(
      `[orders/create] resend admin status=${adminResult.status} id=${adminResult.id || "n/a"} to=${adminEmail}`
    );
  } catch (error) {
    result.adminStatus = "failed";
    const message = errorMessage(error);
    result.adminError = message;
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
        const replay = await ensureCustomerConfirmationForExistingOrder(existingOrder.id);

        return NextResponse.json(
          buildOrderResponse({
            orderId: existingOrder.id,
            reused: true,
            emailStatus: replay.context.emailStatus || existingOrder.emailStatus || null,
            emailError: replay.context.emailError || existingOrder.emailError || null,
            emailAdminSent: null,
            emailCustomerSent:
              replay.customer.status === "sent" ? true : replay.customer.status === "failed" ? false : null,
            customerEmailStatus: replay.customer.status,
            customerEmailError: replay.customer.error,
            customerEmailSentAt: replay.customer.sentAt,
          })
        );
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
          const replay = await ensureCustomerConfirmationForExistingOrder(duplicate.id);
          return NextResponse.json(
            buildOrderResponse({
              orderId: duplicate.id,
              reused: true,
              emailStatus: replay.context.emailStatus || duplicate.emailStatus || null,
              emailError: replay.context.emailError || duplicate.emailError || null,
              emailAdminSent: null,
              emailCustomerSent:
                replay.customer.status === "sent"
                  ? true
                  : replay.customer.status === "failed"
                    ? false
                    : null,
              customerEmailStatus: replay.customer.status,
              customerEmailError: replay.customer.error,
              customerEmailSentAt: replay.customer.sentAt,
            })
          );
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
      const replay = await ensureCustomerConfirmationForExistingOrder(orderId);
      return NextResponse.json(
        buildOrderResponse({
          orderId,
          reused: true,
          emailStatus: replay.context.emailStatus || null,
          emailError: replay.context.emailError || null,
          emailAdminSent: null,
          emailCustomerSent:
            replay.customer.status === "sent" ? true : replay.customer.status === "failed" ? false : null,
          customerEmailStatus: replay.customer.status,
          customerEmailError: replay.customer.error,
          customerEmailSentAt: replay.customer.sentAt,
        })
      );
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
      resend_customer_from_email: !!process.env.RESEND_CUSTOMER_FROM_EMAIL,
      admin_order_email: !!process.env.ADMIN_ORDER_EMAIL,
    });

    let emailResult: Awaited<ReturnType<typeof sendOrderEmails>> = {
      customer: {
        status: "skipped",
        error: null,
        sentAt: null,
      },
      adminStatus: "skipped",
      adminError: null,
      errors: [],
    };

    try {
      emailResult = await sendOrderEmails({
        orderId,
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
        customer: {
          status: "failed",
          error: message,
          sentAt: null,
        },
        adminStatus: "failed",
        adminError: message,
        errors: [`unexpected_email_error: ${message}`],
      };
      console.error(`[orders/create] unexpected email pipeline error=${message}`);
    }

    const emailAdminSent = emailResult.adminStatus === "sent";
    const emailCustomerSent = emailResult.customer.status === "sent";
    let derivedEmailStatus = deriveAggregateEmailStatus({
      adminStatus: emailResult.adminStatus,
      customerStatus: emailResult.customer.status,
    });
    if (emailResult.errors.length > 0 && derivedEmailStatus === "sent") {
      derivedEmailStatus = "partial";
    }
    if (emailResult.errors.length > 0 && derivedEmailStatus === "skipped") {
      derivedEmailStatus = "failed";
    }
    const emailError = emailResult.errors.length ? emailResult.errors.join(" | ") : null;
    const warning = emailError
      ? "Order was created but one or more emails failed to send."
      : null;

    console.log(
      `[orders/create] email_status=${derivedEmailStatus} customer=${emailResult.customer.status} admin=${emailResult.adminStatus}`
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

    return NextResponse.json(
      buildOrderResponse({
        orderId,
        emailStatus: derivedEmailStatus,
        emailError,
        emailAdminSent,
        emailCustomerSent,
        customerEmailStatus: emailResult.customer.status,
        customerEmailError: emailResult.customer.error,
        customerEmailSentAt: emailResult.customer.sentAt,
        warning,
      })
    );
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error) },
      { status: 500 }
    );
  }
}
