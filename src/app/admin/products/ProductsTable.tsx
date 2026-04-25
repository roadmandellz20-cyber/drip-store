"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminProduct } from "@/lib/admin-products";

function formatAmount(cents: number, currency: string) {
  return `${currency.toUpperCase()} ${Math.round(cents / 100).toLocaleString()}`;
}

function getStatusBadge(product: AdminProduct) {
  if (!product.is_active || product.status === "ARCHIVED") return { label: "ARCHIVED", cls: "admin-badge--archived" };
  if (product.is_limited) return { label: "LIMITED", cls: "admin-badge--limited" };
  return { label: "AVAILABLE", cls: "admin-badge--available" };
}

function getVisibilityBadge(product: AdminProduct) {
  if (!product.is_active || product.status === "ARCHIVED") return { label: "ARCHIVED", cls: "admin-badge--archived" };
  return { label: "LIVE", cls: "admin-badge--live" };
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
      [product.slug, product.title, product.status, product.is_new ? "new" : "", product.is_limited ? "limited" : ""]
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
        headers: { "Content-Type": "application/json" },
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
      if (!response.ok) throw new Error(data.error || "Update failed.");

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
      <div className="admin-toolbar">
        <div className="admin-toolbar__left">
          <input
            type="search"
            className="admin-search"
            placeholder="Search by SKU, name, status..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="admin-count">
            {filtered.length} / {products.length}
          </span>
        </div>
        <Link className="btn btn--primary" href="/admin/products/new">
          NEW PRODUCT
        </Link>
      </div>

      {filtered.length === 0 ? (
        <p className="admin-count" style={{ padding: "20px 0" }}>No products match.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>NAME</th>
                <th>PRICE</th>
                <th>STATUS</th>
                <th>VISIBILITY</th>
                <th>LIMITED</th>
                <th>STOCK</th>
                <th>SOLD</th>
                <th>NEW</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const row = rowState[product.slug];
                const saving = Boolean(row?.saving) || isPending;
                const statusBadge = getStatusBadge(product);
                const visibilityBadge = getVisibilityBadge(product);

                return (
                  <tr
                    key={product.slug}
                    className={!product.is_active ? "admin-table__row--faded" : ""}
                  >
                    <td className="admin-table__sku">{product.slug}</td>
                    <td className="admin-table__name">{product.title}</td>
                    <td className="admin-table__muted">{formatAmount(product.price_cents, product.currency)}</td>
                    <td>
                      <span className={`admin-badge ${statusBadge.cls}`}>{statusBadge.label}</span>
                    </td>
                    <td>
                      <span className={`admin-badge ${visibilityBadge.cls}`}>{visibilityBadge.label}</span>
                    </td>
                    <td>
                      <span className={`admin-badge ${product.is_limited ? "admin-badge--yes" : "admin-badge--no"}`}>
                        {product.is_limited ? "YES" : "NO"}
                      </span>
                    </td>
                    <td className="admin-table__muted">{product.stock_qty ?? "—"}</td>
                    <td className="admin-table__muted">{product.sold_qty}</td>
                    <td>
                      <span className={`admin-badge ${product.is_new ? "admin-badge--yes" : "admin-badge--no"}`}>
                        {product.is_new ? "YES" : "NO"}
                      </span>
                    </td>
                    <td className="admin-table__actions">
                      <div className="admin-table__action-row">
                        <Link
                          className="btn btn--ghost"
                          href={`/admin/products/${encodeURIComponent(product.slug)}`}
                          style={{ fontSize: "11px", padding: "5px 12px" }}
                        >
                          EDIT
                        </Link>
                        <button
                          className={product.status === "ARCHIVED" ? "btn btn--primary" : "btn btn--ghost"}
                          type="button"
                          disabled={saving}
                          style={{ fontSize: "11px", padding: "5px 12px" }}
                          onClick={() => void toggleArchive(product)}
                        >
                          {saving ? "..." : product.status === "ARCHIVED" ? "UNARCHIVE" : "ARCHIVE"}
                        </button>
                        {row?.error ? (
                          <span style={{ color: "#c0392b", fontSize: "11px", fontFamily: "var(--mono)" }}>
                            {row.error}
                          </span>
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
