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

function getStatusStyle(status: string): React.CSSProperties {
  if (status === "confirmed") return { color: "#4caf50", fontWeight: 700 };
  if (status === "cancelled") return { color: "var(--red)", fontWeight: 700 };
  if (status === "completed") return { color: "#ffd700", fontWeight: 700 };
  return { color: "var(--muted)" };
}

const cell: React.CSSProperties = {
  padding: "10px 14px",
  borderBottom: "1px solid var(--line)",
  whiteSpace: "nowrap",
  verticalAlign: "middle",
  fontSize: "13px",
  fontFamily: "var(--mono)",
};

const head: React.CSSProperties = {
  padding: "8px 14px",
  borderBottom: "1px solid var(--line)",
  color: "rgba(255,255,255,.4)",
  fontWeight: 700,
  letterSpacing: ".12em",
  fontSize: "10px",
  whiteSpace: "nowrap",
  textAlign: "left",
};

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
        <div
          className={stateMessage.tone === "error" ? "checkout__error" : "checkout__note"}
          style={{ marginBottom: "16px" }}
        >
          {stateMessage.text}
        </div>
      ) : null}

      <div style={{ marginBottom: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
        <input
          type="search"
          placeholder="Search by order ref, email, or name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            background: "transparent",
            border: "1px solid var(--line)",
            color: "var(--fg)",
            padding: "8px 12px",
            fontFamily: "var(--mono)",
            fontSize: "12px",
            width: "340px",
            outline: "none",
          }}
        />
        <span
          style={{
            fontSize: "11px",
            color: "var(--muted)",
            fontFamily: "var(--mono)",
          }}
        >
          {filtered.length} / {orders.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="checkout__note">No orders match.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={head}>ORDER REF</th>
                <th style={head}>NAME</th>
                <th style={head}>EMAIL</th>
                <th style={head}>TOTAL</th>
                <th style={head}>STATUS</th>
                <th style={head}>EMAIL</th>
                <th style={head}>DATE</th>
                <th style={head}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const status = order.status.toLowerCase();
                const canConfirm = status !== "confirmed" && status !== "completed";
                const canCancel = status !== "cancelled" && status !== "completed";

                return (
                  <tr key={order.id}>
                    <td style={{ ...cell, letterSpacing: ".06em", color: "var(--fg)" }}>
                      {order.order_number || "—"}
                    </td>
                    <td style={{ ...cell, maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {order.customer_name || "—"}
                    </td>
                    <td style={{ ...cell, color: "var(--muted)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {order.customer_email || "—"}
                    </td>
                    <td style={{ ...cell, color: "var(--muted)" }}>
                      {formatAmount(order.total_cents, order.currency)}
                    </td>
                    <td style={cell}>
                      <span style={getStatusStyle(status)}>{status}</span>
                    </td>
                    <td style={{ ...cell, color: "var(--muted)", fontSize: "11px" }}>
                      {order.email_status || "—"}
                    </td>
                    <td style={{ ...cell, color: "var(--muted)", fontSize: "11px" }}>
                      {formatDate(order.created_at)}
                    </td>
                    <td style={{ ...cell, minWidth: "220px" }}>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <Link
                          className="btn btn--ghost"
                          href={`/success?order_id=${encodeURIComponent(order.id)}`}
                          style={{ fontSize: "11px", padding: "4px 10px" }}
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
                            style={{ fontSize: "11px", padding: "4px 10px" }}
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
                            style={{ fontSize: "11px", padding: "4px 10px" }}
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
                            style={{ fontSize: "11px", padding: "4px 10px" }}
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
