"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ADMIN_CSRF_FORM_FIELD } from "@/lib/admin-auth";

export type AdminOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  total_cents: number;
  currency: string;
  status: string;
  email_status: string;
  created_at: string;
};

function formatAmount(cents: number, currency: string) {
  return `${currency.toUpperCase()} ${Math.round(cents / 100).toLocaleString()}`;
}

function formatDate(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function getStatusBadge(status: string): { cls: string } {
  if (status === "confirmed") return { cls: "admin-badge--confirmed" };
  if (status === "cancelled") return { cls: "admin-badge--cancelled" };
  if (status === "completed") return { cls: "admin-badge--completed" };
  return { cls: "admin-badge--pending" };
}

export default function OrdersClient({
  orders,
  csrfToken,
  stateMessage,
}: {
  orders: AdminOrder[];
  csrfToken: string;
  stateMessage: { tone: "ok" | "error"; text: string } | null;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.order_number.toLowerCase().includes(q) ||
        o.customer_email.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q)
    );
  }, [orders, query]);

  return (
    <div>
      {stateMessage ? (
        <p
          className={stateMessage.tone === "error" ? "admin-form__msg--error" : "admin-form__msg--ok"}
          style={{ marginBottom: "16px" }}
        >
          {stateMessage.text}
        </p>
      ) : null}

      <div className="admin-toolbar">
        <div className="admin-toolbar__left">
          <input
            type="search"
            className="admin-search"
            placeholder="Search by order ref, email, or name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="admin-count">
            {filtered.length} / {orders.length}
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="admin-count" style={{ padding: "20px 0" }}>No orders match.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ORDER REF</th>
                <th>NAME</th>
                <th>EMAIL</th>
                <th>TOTAL</th>
                <th>STATUS</th>
                <th>EMAIL</th>
                <th>DATE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const status = order.status.toLowerCase();
                const canConfirm = status !== "confirmed" && status !== "completed";
                const canCancel = status !== "cancelled" && status !== "completed";
                const badge = getStatusBadge(status);

                return (
                  <tr key={order.id}>
                    <td className="admin-table__ref">{order.order_number || "—"}</td>
                    <td className="admin-table__name">{order.customer_name || "—"}</td>
                    <td className="admin-table__muted" style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {order.customer_email || "—"}
                    </td>
                    <td className="admin-table__muted">{formatAmount(order.total_cents, order.currency)}</td>
                    <td>
                      <span className={`admin-badge ${badge.cls}`}>{status}</span>
                    </td>
                    <td className="admin-table__muted" style={{ fontSize: "11px" }}>
                      {order.email_status || "—"}
                    </td>
                    <td className="admin-table__muted" style={{ fontSize: "11px" }}>
                      {formatDate(order.created_at)}
                    </td>
                    <td className="admin-table__actions">
                      <div className="admin-table__action-row">
                        <Link
                          className="btn btn--ghost"
                          href={`/success?order_id=${encodeURIComponent(order.id)}`}
                          style={{ fontSize: "11px", padding: "5px 12px" }}
                        >
                          VIEW
                        </Link>
                        <form
                          action={`/api/admin/orders/${encodeURIComponent(order.id)}`}
                          method="post"
                          style={{ display: "inline" }}
                        >
                          <input type="hidden" name={ADMIN_CSRF_FORM_FIELD} value={csrfToken} />
                          <input type="hidden" name="action" value="confirm" />
                          <button
                            className="btn btn--primary"
                            type="submit"
                            disabled={!canConfirm}
                            style={{ fontSize: "11px", padding: "5px 12px" }}
                          >
                            CONFIRM
                          </button>
                        </form>
                        <form
                          action={`/api/admin/orders/${encodeURIComponent(order.id)}`}
                          method="post"
                          style={{ display: "inline" }}
                        >
                          <input type="hidden" name={ADMIN_CSRF_FORM_FIELD} value={csrfToken} />
                          <input type="hidden" name="action" value="cancel" />
                          <button
                            className="btn btn--ghost"
                            type="submit"
                            disabled={!canCancel}
                            style={{ fontSize: "11px", padding: "5px 12px" }}
                          >
                            CANCEL
                          </button>
                        </form>
                        <form
                          action={`/api/admin/orders/${encodeURIComponent(order.id)}`}
                          method="post"
                          style={{ display: "inline" }}
                        >
                          <input type="hidden" name={ADMIN_CSRF_FORM_FIELD} value={csrfToken} />
                          <input type="hidden" name="action" value="delete" />
                          <button
                            className="btn btn--ghost btn--danger"
                            type="submit"
                            style={{ fontSize: "11px", padding: "5px 12px" }}
                          >
                            DELETE
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
