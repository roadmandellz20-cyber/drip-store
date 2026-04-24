"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  detailsToTextarea,
  type AdminProduct,
  type AdminProductStatus,
} from "@/lib/admin-products";

const STATUS_OPTIONS: AdminProductStatus[] = ["AVAILABLE", "LIMITED", "ARCHIVED"];

type ProductFormState = {
  slug: string;
  title: string;
  price: string;
  image_url: string;
  description: string;
  details: string;
  brand_line: string;
  is_new: boolean;
  is_limited: boolean;
  stock_qty: string;
  status: AdminProductStatus;
  sort_order: string;
};

function toInitialState(product?: AdminProduct | null): ProductFormState {
  return {
    slug: product?.slug || "",
    title: product?.title || "",
    price:
      typeof product?.price_cents === "number" && product.price_cents > 0
        ? (product.price_cents / 100).toString()
        : "",
    image_url: product?.image_url || "",
    description: product?.description || "",
    details: detailsToTextarea(product?.details || []),
    brand_line: product?.brand_line || "ENTER THE MUGEN.",
    is_new: product?.is_new || false,
    is_limited: product?.is_limited || false,
    stock_qty:
      typeof product?.stock_qty === "number" && product.stock_qty >= 0
        ? String(product.stock_qty)
        : "",
    status: product?.status || "AVAILABLE",
    sort_order: typeof product?.sort_order === "number" ? String(product.sort_order) : "0",
  };
}

function parseDetails(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function ProductForm({
  mode,
  product,
}: {
  mode: "create" | "edit";
  product?: AdminProduct | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormState>(() => toInitialState(product));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const effectiveStatus = useMemo(() => {
    if (form.status === "ARCHIVED") return "ARCHIVED";
    if (form.is_limited) return "LIMITED";
    return form.status === "LIMITED" ? "AVAILABLE" : form.status;
  }, [form.is_limited, form.status]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);

    const price = Number(form.price);
    const priceCents = Number.isFinite(price) ? Math.round(price * 100) : NaN;

    const payload = {
      ...(mode === "create" ? { slug: form.slug } : {}),
      title: form.title,
      description: form.description,
      details: parseDetails(form.details),
      brand_line: form.brand_line,
      image_url: form.image_url,
      price_cents: priceCents,
      currency: "GMD",
      status: effectiveStatus,
      is_active: effectiveStatus !== "ARCHIVED",
      is_limited: form.is_limited,
      stock_qty: form.is_limited ? (form.stock_qty.trim() === "" ? null : Number(form.stock_qty)) : null,
      is_new: form.is_new,
      sort_order: form.sort_order.trim() === "" ? 0 : Number(form.sort_order),
    };

    try {
      const response = await fetch(
        mode === "create"
          ? "/api/admin/products"
          : `/api/admin/products/${encodeURIComponent(product?.slug || form.slug)}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        product?: AdminProduct;
      };

      if (!response.ok || data.ok !== true || !data.product) {
        throw new Error(data.error || "Save failed.");
      }

      setForm(toInitialState(data.product));
      setResult({ tone: "ok", text: mode === "create" ? "Product created." : "Product saved." });

      if (mode === "create") {
        router.replace(`/admin/products/${encodeURIComponent(data.product.slug)}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      setResult({
        tone: "error",
        text: error instanceof Error ? error.message : "Save failed.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="panel">
      <div className="panel__line" />
      <div className="panel__body">
        <form className="checkout-form" onSubmit={onSubmit}>
          <div className="checkout-form__row2">
            <label className="checkout-form__field">
              <span>SKU / SLUG</span>
              <input
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                disabled={mode === "edit"}
                required
              />
            </label>

            <label className="checkout-form__field">
              <span>SORT ORDER</span>
              <input
                type="number"
                value={form.sort_order}
                onChange={(event) => setForm((prev) => ({ ...prev, sort_order: event.target.value }))}
              />
            </label>
          </div>

          <label className="checkout-form__field">
            <span>TITLE</span>
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              required
            />
          </label>

          <div className="checkout-form__row2">
            <label className="checkout-form__field">
              <span>PRICE (GMD)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                required
              />
            </label>

            <label className="checkout-form__field">
              <span>STATUS</span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    status: event.target.value as AdminProductStatus,
                    is_limited:
                      event.target.value === "ARCHIVED"
                        ? false
                        : event.target.value === "LIMITED"
                          ? true
                          : false,
                  }))
                }
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="checkout-form__field">
            <span>IMAGE URL</span>
            <input
              value={form.image_url}
              onChange={(event) => setForm((prev) => ({ ...prev, image_url: event.target.value }))}
              required
            />
          </label>

          <label className="checkout-form__field">
            <span>DESCRIPTION</span>
            <textarea
              rows={8}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </label>

          <label className="checkout-form__field">
            <span>DETAIL BULLETS</span>
            <textarea
              rows={6}
              value={form.details}
              onChange={(event) => setForm((prev) => ({ ...prev, details: event.target.value }))}
              placeholder={"One detail per line"}
            />
          </label>

          <label className="checkout-form__field">
            <span>BRAND LINE</span>
            <input
              value={form.brand_line}
              onChange={(event) => setForm((prev) => ({ ...prev, brand_line: event.target.value }))}
            />
          </label>

          <div
            style={{
              display: "grid",
              gap: "16px",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              marginBottom: "18px",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontFamily: "var(--mono)",
                fontSize: "12px",
              }}
            >
              <input
                type="checkbox"
                checked={form.is_new}
                onChange={(event) => setForm((prev) => ({ ...prev, is_new: event.target.checked }))}
              />
              MARK AS NEW
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontFamily: "var(--mono)",
                fontSize: "12px",
              }}
            >
              <input
                type="checkbox"
                checked={form.is_limited}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    is_limited: event.target.checked,
                    status:
                      prev.status === "ARCHIVED"
                        ? "ARCHIVED"
                        : event.target.checked
                          ? "LIMITED"
                          : "AVAILABLE",
                  }))
                }
              />
              LIMITED PRODUCT
            </label>

            <label className="checkout-form__field" style={{ marginBottom: 0 }}>
              <span>STOCK QTY</span>
              <input
                type="number"
                min="0"
                value={form.stock_qty}
                onChange={(event) => setForm((prev) => ({ ...prev, stock_qty: event.target.value }))}
                disabled={!form.is_limited || form.status === "ARCHIVED"}
                placeholder={form.is_limited ? "0" : "Not used"}
              />
            </label>
          </div>

          {result ? (
            <div className={result.tone === "error" ? "checkout__error" : "checkout__note"}>
              {result.text}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn btn--primary" type="submit" disabled={submitting}>
              {submitting ? "SAVING..." : mode === "create" ? "CREATE PRODUCT" : "SAVE PRODUCT"}
            </button>
            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => router.push("/admin/products")}
              disabled={submitting}
            >
              BACK TO PRODUCTS
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
