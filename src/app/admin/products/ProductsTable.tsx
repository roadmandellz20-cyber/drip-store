"use client";

import { useState, useCallback } from "react";
import type { AdminProduct } from "./page";

const STATUS_OPTIONS = ["AVAILABLE", "LIMITED", "ARCHIVED"] as const;

type SaveResult = "idle" | "ok" | "error";

type RowState = {
  stock_qty: string;
  is_limited: boolean;
  status: string;
  saving: boolean;
  result: SaveResult;
  errorMsg: string;
};

function buildRowState(p: AdminProduct): RowState {
  return {
    stock_qty: p.stock_qty !== null ? String(p.stock_qty) : "",
    is_limited: p.is_limited,
    status: p.status,
    saving: false,
    result: "idle",
    errorMsg: "",
  };
}

function isDirty(original: AdminProduct, current: RowState) {
  const origStock = original.stock_qty !== null ? String(original.stock_qty) : "";
  return (
    current.stock_qty !== origStock ||
    current.is_limited !== original.is_limited ||
    current.status !== original.status
  );
}

const cell: React.CSSProperties = {
  padding: "10px 14px",
  borderBottom: "1px solid var(--line)",
  whiteSpace: "nowrap",
  verticalAlign: "middle",
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

const inputStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--line)",
  color: "var(--fg)",
  padding: "4px 8px",
  fontFamily: "var(--mono)",
  fontSize: "12px",
  width: "80px",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  background: "#0d0d0d",
  border: "1px solid var(--line)",
  color: "var(--fg)",
  padding: "4px 8px",
  fontFamily: "var(--mono)",
  fontSize: "12px",
  cursor: "pointer",
  outline: "none",
};

export default function ProductsTable({ products }: { products: AdminProduct[] }) {
  const [rows, setRows] = useState<Record<string, RowState>>(() => {
    const init: Record<string, RowState> = {};
    for (const p of products) {
      init[p.slug] = buildRowState(p);
    }
    return init;
  });

  const update = useCallback((slug: string, patch: Partial<RowState>) => {
    setRows((prev) => ({ ...prev, [slug]: { ...prev[slug], ...patch } }));
  }, []);

  const save = useCallback(
    async (product: AdminProduct) => {
      const row = rows[product.slug];
      if (!row || row.saving) return;

      const stockQtyStr = row.stock_qty.trim();
      const stockQty =
        stockQtyStr === "" ? null : parseInt(stockQtyStr, 10);

      if (stockQtyStr !== "" && (isNaN(stockQty!) || stockQty! < 0)) {
        update(product.slug, { result: "error", errorMsg: "Invalid stock qty." });
        return;
      }

      update(product.slug, { saving: true, result: "idle", errorMsg: "" });

      try {
        const res = await fetch(
          `/api/admin/products/${encodeURIComponent(product.slug)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              stock_qty: stockQty,
              is_limited: row.is_limited,
              status: row.status,
            }),
          }
        );

        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
        };

        if (!res.ok || !data.ok) {
          update(product.slug, {
            saving: false,
            result: "error",
            errorMsg: data.error ?? "Save failed.",
          });
        } else {
          update(product.slug, { saving: false, result: "ok", errorMsg: "" });
        }
      } catch {
        update(product.slug, {
          saving: false,
          result: "error",
          errorMsg: "Network error.",
        });
      }
    },
    [rows, update]
  );

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "13px",
          fontFamily: "var(--mono)",
        }}
      >
        <thead>
          <tr>
            <th style={head}>SKU</th>
            <th style={head}>NAME</th>
            <th style={head}>PRICE</th>
            <th style={head}>LIMITED</th>
            <th style={head}>STOCK QTY</th>
            <th style={head}>SOLD QTY</th>
            <th style={head}>STATUS</th>
            <th style={head}>SOLD OUT</th>
            <th style={head}>SAVE</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const row = rows[product.slug];
            if (!row) return null;
            const dirty = isDirty(product, row);

            return (
              <tr
                key={product.slug}
                style={{ opacity: product.is_active ? 1 : 0.45 }}
              >
                <td style={{ ...cell, color: "var(--muted)", letterSpacing: ".06em" }}>
                  {product.slug}
                </td>
                <td style={{ ...cell, maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {product.title}
                </td>
                <td style={{ ...cell, color: "var(--muted)" }}>
                  GMD {Math.round(product.price_cents / 100).toLocaleString()}
                </td>
                <td style={cell}>
                  <input
                    type="checkbox"
                    checked={row.is_limited}
                    onChange={(e) =>
                      update(product.slug, {
                        is_limited: e.target.checked,
                        result: "idle",
                      })
                    }
                    style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#fff" }}
                  />
                </td>
                <td style={cell}>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={row.stock_qty}
                    placeholder="—"
                    onChange={(e) =>
                      update(product.slug, { stock_qty: e.target.value, result: "idle" })
                    }
                    style={inputStyle}
                  />
                </td>
                <td style={{ ...cell, color: "var(--muted)" }}>{product.sold_qty}</td>
                <td style={cell}>
                  <select
                    value={row.status}
                    onChange={(e) =>
                      update(product.slug, { status: e.target.value, result: "idle" })
                    }
                    style={selectStyle}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={cell}>
                  <span
                    style={{
                      color: product.soldOut ? "var(--red)" : "rgba(255,255,255,.3)",
                      fontWeight: product.soldOut ? 700 : 400,
                      letterSpacing: ".08em",
                    }}
                  >
                    {product.soldOut ? "YES" : "NO"}
                  </span>
                </td>
                <td style={{ ...cell, minWidth: "120px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button
                      className="btn btn--primary"
                      type="button"
                      style={{ fontSize: "11px", padding: "5px 12px", opacity: dirty && !row.saving ? 1 : 0.35 }}
                      disabled={!dirty || row.saving}
                      onClick={() => save(product)}
                    >
                      {row.saving ? "..." : "SAVE"}
                    </button>
                    {row.result === "ok" && (
                      <span style={{ color: "#4caf50", fontSize: "11px", letterSpacing: ".06em" }}>
                        SAVED
                      </span>
                    )}
                    {row.result === "error" && (
                      <span style={{ color: "var(--red)", fontSize: "11px" }}>
                        {row.errorMsg}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
