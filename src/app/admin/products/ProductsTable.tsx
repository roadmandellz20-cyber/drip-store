"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminProduct } from "@/lib/admin-products";

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

function formatAmount(cents: number, currency: string) {
  return `${currency.toUpperCase()} ${Math.round(cents / 100).toLocaleString()}`;
}

function getVisibilityLabel(product: AdminProduct) {
  if (!product.is_active || product.status === "ARCHIVED") return "ARCHIVED";
  return "LIVE";
}

export default function ProductsTable({ products }: { products: AdminProduct[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [rowState, setRowState] = useState<Record<string, { saving?: boolean; error?: string }>>({});
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;

    return products.filter((product) =>
      [
        product.slug,
        product.title,
        product.status,
        product.is_new ? "new" : "",
        product.is_limited ? "limited" : "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [products, query]);

  async function toggleArchive(product: AdminProduct) {
    setRowState((prev) => ({ ...prev, [product.slug]: { saving: true } }));

    const nextStatus = product.status === "ARCHIVED" ? (product.is_limited ? "LIMITED" : "AVAILABLE") : "ARCHIVED";
    const nextActive = nextStatus !== "ARCHIVED";

    try {
      const response = await fetch(`/api/admin/products/${encodeURIComponent(product.slug)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: product.title,
          description: product.description,
          details: product.details,
          brand_line: product.brand_line,
          image_url: product.image_url,
          price_cents: product.price_cents,
          currency: product.currency,
          status: nextStatus,
          is_active: nextActive,
          is_limited: product.is_limited,
          stock_qty: product.stock_qty,
          is_new: product.is_new,
          sort_order: product.sort_order,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Update failed.");
      }

      startTransition(() => router.refresh());
    } catch (error) {
      setRowState((prev) => ({
        ...prev,
        [product.slug]: {
          saving: false,
          error: error instanceof Error ? error.message : "Update failed.",
        },
      }));
      return;
    }

    setRowState((prev) => ({ ...prev, [product.slug]: { saving: false } }));
  }

  return (
    <div>
      <div
        style={{
          marginBottom: "16px",
          display: "flex",
          gap: "12px",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="search"
            placeholder="Search by SKU, name, status..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              background: "transparent",
              border: "1px solid var(--line)",
              color: "var(--fg)",
              padding: "8px 12px",
              fontFamily: "var(--mono)",
              fontSize: "12px",
              width: "320px",
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
            {filtered.length} / {products.length}
          </span>
        </div>

        <Link className="btn btn--primary" href="/admin/products/new">
          NEW PRODUCT
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="checkout__note">No products match.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={head}>SKU</th>
                <th style={head}>NAME</th>
                <th style={head}>PRICE</th>
                <th style={head}>STATUS</th>
                <th style={head}>LIMITED</th>
                <th style={head}>STOCK</th>
                <th style={head}>SOLD</th>
                <th style={head}>NEW</th>
                <th style={head}>VISIBILITY</th>
                <th style={head}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const row = rowState[product.slug];
                const saving = Boolean(row?.saving) || isPending;

                return (
                  <tr key={product.slug} style={{ opacity: product.is_active ? 1 : 0.5 }}>
                    <td style={{ ...cell, color: "var(--muted)" }}>{product.slug}</td>
                    <td style={{ ...cell, maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {product.title}
                    </td>
                    <td style={{ ...cell, color: "var(--muted)" }}>
                      {formatAmount(product.price_cents, product.currency)}
                    </td>
                    <td style={cell}>{product.status}</td>
                    <td style={cell}>{product.is_limited ? "YES" : "NO"}</td>
                    <td style={cell}>{product.stock_qty ?? "—"}</td>
                    <td style={cell}>{product.sold_qty}</td>
                    <td style={cell}>{product.is_new ? "YES" : "NO"}</td>
                    <td style={cell}>{getVisibilityLabel(product)}</td>
                    <td style={{ ...cell, minWidth: "220px" }}>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <Link
                          className="btn btn--ghost"
                          href={`/admin/products/${encodeURIComponent(product.slug)}`}
                          style={{ fontSize: "11px", padding: "4px 10px" }}
                        >
                          EDIT
                        </Link>
                        <button
                          className={product.status === "ARCHIVED" ? "btn btn--primary" : "btn btn--ghost"}
                          type="button"
                          disabled={saving}
                          style={{ fontSize: "11px", padding: "4px 10px" }}
                          onClick={() => void toggleArchive(product)}
                        >
                          {saving ? "..." : product.status === "ARCHIVED" ? "UNARCHIVE" : "ARCHIVE"}
                        </button>
                        {row?.error ? (
                          <span style={{ color: "var(--red)", fontSize: "11px" }}>{row.error}</span>
                        ) : null}
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
