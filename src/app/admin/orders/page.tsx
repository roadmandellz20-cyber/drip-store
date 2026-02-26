import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function formatAmount(cents: number, currency: string) {
  return `${currency.toUpperCase()} ${Math.round(cents / 100).toLocaleString()}`;
}

export default async function AdminOrdersPage() {
  const query = await supabaseAdmin
    .from("orders")
    .select("id,order_number,customer_name,customer_email,total_cents,currency,email_status,created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const rows = (query.data as Array<Record<string, unknown>> | null) || [];

  return (
    <main className="page" style={{ maxWidth: 980 }}>
      <div className="page__head">
        <h1 className="page__title">ADMIN ORDERS</h1>
        <p className="page__sub">Last 20 orders (debug view).</p>
      </div>

      {query.error ? (
        <div className="checkout__error">{query.error.message}</div>
      ) : rows.length === 0 ? (
        <div className="checkout__note">No orders found.</div>
      ) : (
        <div className="checkout__list">
          {rows.map((row) => {
            const id = asString(row.id);
            const orderNumber = asString(row.order_number) || "(pending)";
            const name = asString(row.customer_name) || "Unknown";
            const email = asString(row.customer_email) || "-";
            const currency = asString(row.currency) || "GMD";
            const total = Number(row.total_cents) || 0;
            const emailStatus = asString(row.email_status) || "-";
            const createdAt = asString(row.created_at);

            return (
              <article key={id} className="checkout__item" style={{ gridTemplateColumns: "1fr" }}>
                <div className="checkout__row" style={{ justifyContent: "space-between" }}>
                  <strong>{orderNumber}</strong>
                  <span>{formatAmount(total, currency)}</span>
                </div>
                <div className="checkout__row">{name} • {email}</div>
                <div className="checkout__row">email_status: {emailStatus}</div>
                <div className="checkout__row">created_at: {createdAt || "-"}</div>
                <div className="checkout__row">
                  <Link className="btn btn--ghost" href={`/success?order_id=${encodeURIComponent(id)}`}>
                    VIEW
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
