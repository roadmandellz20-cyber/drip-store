import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";

type SuccessPageProps = {
  searchParams?: {
    order_id?: string | string[];
  };
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function fallbackOrderNumber(orderId: string) {
  const token = orderId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
  return `MGN-${new Date().getUTCFullYear()}-${token || "000000"}`;
}

function formatAmount(cents: number, currency: string) {
  return `${currency.toUpperCase()} ${Math.round(cents / 100).toLocaleString()}`;
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const rawOrderId = searchParams?.order_id;
  const orderId = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;

  if (!orderId) {
    return (
      <div className="page">
        <div className="page__head">
          <h1 className="page__title">ORDER RECEIVED</h1>
          <p className="page__sub">
            We could not find your order reference in this link.
          </p>
        </div>
        <Link className="btn btn--ghost" href="/checkout">
          BACK TO CHECKOUT
        </Link>
      </div>
    );
  }

  const orderRes = await supabaseAdmin
    .from("orders")
    .select("id,order_number,total_cents,currency,customer_email,customer_name,created_at")
    .eq("id", orderId)
    .maybeSingle();

  if (orderRes.error) {
    return (
      <div className="page">
        <div className="page__head">
          <h1 className="page__title">ORDER RECEIVED</h1>
          <p className="page__sub">Unable to load order details right now.</p>
          <p className="checkout__error">{orderRes.error.message}</p>
        </div>
        <Link className="btn btn--ghost" href="/archive">
          BACK TO ARCHIVE
        </Link>
      </div>
    );
  }

  if (!orderRes.data) {
    return (
      <div className="page">
        <div className="page__head">
          <h1 className="page__title">ORDER RECEIVED</h1>
          <p className="page__sub">We could not find that order.</p>
        </div>
        <Link className="btn btn--ghost" href="/archive">
          BACK TO ARCHIVE
        </Link>
      </div>
    );
  }

  const order = orderRes.data as Record<string, unknown>;

  const itemsRes = await supabaseAdmin
    .from("order_items")
    .select("title,price_cents,qty,size")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  const items =
    (itemsRes.data as Array<Record<string, unknown>> | null)?.map((item) => {
      const priceCents = Number(item.price_cents) || 0;
      const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
      return {
        title: asString(item.title) || "Item",
        qty,
        size: asString(item.size),
        lineTotalCents: priceCents * qty,
      };
    }) || [];

  const currency = (asString(order.currency) || "GMD").toUpperCase();
  const computedTotal = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const totalCents = Number(order.total_cents) > 0 ? Number(order.total_cents) : computedTotal;
  const orderNumber = asString(order.order_number) || fallbackOrderNumber(asString(order.id));

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">ORDER RECEIVED</h1>
        <p className="page__sub">Thank you. Your order has been captured.</p>
      </div>

      <div className="checkout__side success-panel">
        <div className="checkout-form__title">ORDER DETAILS</div>

        <div className="success-panel__row">
          <span>Order Number</span>
          <strong>{orderNumber}</strong>
        </div>

        <div className="success-panel__row">
          <span>Order ID</span>
          <strong>{asString(order.id)}</strong>
        </div>

        <div className="success-panel__row">
          <span>Customer Email</span>
          <strong>{asString(order.customer_email) || "Not provided"}</strong>
        </div>

        <div className="success-panel__items">
          {items.length === 0 ? (
            <div className="checkout__note">No line items found.</div>
          ) : (
            items.map((item, idx) => (
              <div key={`${item.title}-${idx}`} className="success-panel__item">
                <div>
                  <div className="checkout__name">{item.title}</div>
                  <div className="checkout__row">
                    Qty: {item.qty}
                    {item.size ? ` • Size: ${item.size}` : ""}
                  </div>
                </div>
                <div className="checkout__unit">
                  {formatAmount(item.lineTotalCents, currency)}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="checkout__total">
          <span>Total</span>
          <span>{formatAmount(totalCents, currency)}</span>
        </div>

        <div className="checkout__note">You will be contacted shortly to complete payment.</div>

        <Link className="btn btn--ghost" href="/archive">
          BACK TO ARCHIVE
        </Link>
      </div>
    </div>
  );
}
