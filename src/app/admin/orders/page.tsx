import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_CSRF_FORM_FIELD,
  ADMIN_SESSION_COOKIE,
  createAdminCsrfToken,
  verifyAdminSession,
} from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const metadata: Metadata = {
  title: "Admin Orders",
  robots: {
    index: false,
    follow: false,
  },
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function formatAmount(cents: number, currency: string) {
  return `${currency.toUpperCase()} ${Math.round(cents / 100).toLocaleString()}`;
}

function normalizeStatus(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getStatusClass(status: string) {
  if (status === "confirmed") return "order-status order-status--confirmed";
  if (status === "cancelled") return "order-status order-status--cancelled";
  if (status === "completed") return "order-status order-status--completed";
  return "order-status";
}

function getStateMessage(state?: string) {
  if (state === "confirmed") return { tone: "ok", text: "Order confirmed." };
  if (state === "cancelled") return { tone: "ok", text: "Order cancelled." };
  if (state === "deleted") return { tone: "ok", text: "Order deleted." };
  if (state === "locked") return { tone: "error", text: "Completed orders are locked. Delete them instead." };
  if (state === "missing") return { tone: "error", text: "Order not found." };
  if (state === "invalid") return { tone: "error", text: "Invalid admin action." };
  if (state === "csrf") return { tone: "error", text: "Security check failed. Try again." };
  if (state === "error") return { tone: "error", text: "Admin action failed." };
  return null;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ state?: string }>;
}) {
  const sessionCookie = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  if (!(await verifyAdminSession(sessionCookie))) {
    redirect("/admin/login?redirect=/admin/orders");
  }

  const csrfToken = await createAdminCsrfToken(sessionCookie);
  if (!csrfToken) {
    redirect("/admin/login?redirect=/admin/orders");
  }

  const query = await supabaseAdmin
    .from("orders")
    .select("id,order_number,customer_name,customer_email,total_cents,currency,email_status,created_at,status")
    .order("created_at", { ascending: false })
    .limit(20);

  const rows = (query.data as Array<Record<string, unknown>> | null) || [];
  const stateMessage = getStateMessage(resolvedSearchParams.state);

  return (
    <main className="page page--admin-wide">
      <div className="page__head">
        <h1 className="page__title">ADMIN ORDERS</h1>
        <p className="page__sub">Last 20 orders (debug view).</p>
        <div className="page__actions">
          <form action="/api/admin/logout" method="post">
            <input type="hidden" name={ADMIN_CSRF_FORM_FIELD} value={csrfToken} />
            <button className="btn btn--ghost" type="submit">
              LOG OUT
            </button>
          </form>
        </div>
      </div>

      {stateMessage ? (
        <div className={stateMessage.tone === "error" ? "checkout__error" : "checkout__note"}>
          {stateMessage.text}
        </div>
      ) : null}

      {query.error ? (
        <div className="checkout__error">Unable to load orders right now.</div>
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
            const status = normalizeStatus(row.status) || "pending";
            const canConfirm = status !== "confirmed" && status !== "completed";
            const canCancel = status !== "cancelled" && status !== "completed";
            const canDelete = true;

            return (
              <article key={id} className="checkout__item checkout__item--stacked">
                <div className="checkout__row checkout__row--space-between">
                  <strong>{orderNumber}</strong>
                  <span>{formatAmount(total, currency)}</span>
                </div>
                <div className="checkout__row">
                  {name} • {email}
                </div>
                <div className="checkout__row">
                  status: <strong className={getStatusClass(status)}>{status}</strong>
                </div>
                <div className="checkout__row">email_status: {emailStatus}</div>
                <div className="checkout__row">created_at: {createdAt || "-"}</div>
                <div className="checkout__row checkout__row--admin-actions">
                  <Link className="btn btn--ghost" href={`/success?order_id=${encodeURIComponent(id)}`}>
                    VIEW
                  </Link>
                  <form action={`/api/admin/orders/${encodeURIComponent(id)}`} method="post">
                    <input type="hidden" name={ADMIN_CSRF_FORM_FIELD} value={csrfToken} />
                    <input type="hidden" name="action" value="confirm" />
                    <button className="btn btn--primary" type="submit" disabled={!canConfirm}>
                      CONFIRM
                    </button>
                  </form>
                  <form action={`/api/admin/orders/${encodeURIComponent(id)}`} method="post">
                    <input type="hidden" name={ADMIN_CSRF_FORM_FIELD} value={csrfToken} />
                    <input type="hidden" name="action" value="cancel" />
                    <button className="btn btn--ghost" type="submit" disabled={!canCancel}>
                      CANCEL
                    </button>
                  </form>
                  <form action={`/api/admin/orders/${encodeURIComponent(id)}`} method="post">
                    <input type="hidden" name={ADMIN_CSRF_FORM_FIELD} value={csrfToken} />
                    <input type="hidden" name="action" value="delete" />
                    <button className="btn btn--ghost btn--danger" type="submit" disabled={!canDelete}>
                      DELETE
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
