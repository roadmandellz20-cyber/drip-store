"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { detailsToTextarea, type AdminProduct, type AdminProductStatus } from "@/lib/admin-products";

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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        product?: AdminProduct;
      };

      if (!response.ok || data.ok !== true || !data.product) {
        // Prefer the server's specific error message; fall back to HTTP status
        throw new Error(data.error || `Request failed (${response.status}).`);
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
    <form className="admin-form" onSubmit={onSubmit}>
      {/* Identity */}
      <div className="admin-form__row2">
        <div className="admin-form__field">
          <label className="admin-form__label">SKU / SLUG</label>
          <input
            className="admin-form__input"
            value={form.slug}
            onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
            disabled={mode === "edit"}
            required
          />
        </div>
        <div className="admin-form__field">
          <label className="admin-form__label">SORT ORDER</label>
          <input
            className="admin-form__input"
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm((prev) => ({ ...prev, sort_order: e.target.value }))}
          />
        </div>
      </div>

      <div className="admin-form__field">
        <label className="admin-form__label">TITLE</label>
        <input
          className="admin-form__input"
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          required
        />
      </div>

      {/* Pricing + Status */}
      <div className="admin-form__section">
        <div className="admin-form__row2">
          <div className="admin-form__field">
            <label className="admin-form__label">PRICE (GMD)</label>
            <input
              className="admin-form__input"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
              required
            />
          </div>
          <div className="admin-form__field">
            <label className="admin-form__label">STATUS</label>
            <select
              className="admin-form__select"
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  status: e.target.value as AdminProductStatus,
                  is_limited:
                    e.target.value === "ARCHIVED"
                      ? false
                      : e.target.value === "LIMITED"
                        ? true
                        : false,
                }))
              }
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Media */}
      <div className="admin-form__section">
        <div className="admin-form__field">
          <label className="admin-form__label">IMAGE URL</label>
          <input
            className="admin-form__input"
            value={form.image_url}
            onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
            required
          />
        </div>
      </div>

      {/* Content */}
      <div className="admin-form__section">
        <div className="admin-form__field">
          <label className="admin-form__label">DESCRIPTION</label>
          <textarea
            className="admin-form__textarea"
            rows={8}
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />
        </div>
        <div className="admin-form__field">
          <label className="admin-form__label">DETAIL BULLETS</label>
          <textarea
            className="admin-form__textarea"
            rows={5}
            value={form.details}
            onChange={(e) => setForm((prev) => ({ ...prev, details: e.target.value }))}
            placeholder="One detail per line"
          />
        </div>
        <div className="admin-form__field">
          <label className="admin-form__label">BRAND LINE</label>
          <input
            className="admin-form__input"
            value={form.brand_line}
            onChange={(e) => setForm((prev) => ({ ...prev, brand_line: e.target.value }))}
          />
        </div>
      </div>

      {/* Flags */}
      <div className="admin-form__section">
        <div className="admin-form__checks">
          <label className="admin-form__check">
            <input
              type="checkbox"
              checked={form.is_new}
              onChange={(e) => setForm((prev) => ({ ...prev, is_new: e.target.checked }))}
            />
            MARK AS NEW
          </label>
          <label className="admin-form__check">
            <input
              type="checkbox"
              checked={form.is_limited}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  is_limited: e.target.checked,
                  status:
                    prev.status === "ARCHIVED"
                      ? "ARCHIVED"
                      : e.target.checked
                        ? "LIMITED"
                        : "AVAILABLE",
                }))
              }
            />
            LIMITED PRODUCT
          </label>
          <div className="admin-form__field" style={{ marginBottom: 0 }}>
            <label className="admin-form__label">STOCK QTY</label>
            <input
              className="admin-form__input"
              type="number"
              min="0"
              value={form.stock_qty}
              onChange={(e) => setForm((prev) => ({ ...prev, stock_qty: e.target.value }))}
              disabled={!form.is_limited || form.status === "ARCHIVED"}
              placeholder={form.is_limited ? "0" : "Not used"}
              style={{ maxWidth: "160px" }}
            />
          </div>
        </div>
      </div>

      {/* Result message */}
      {result ? (
        <p className={result.tone === "error" ? "admin-form__msg--error" : "admin-form__msg--ok"}>
          {result.text}
        </p>
      ) : null}

      {/* Actions */}
      <div className="admin-form__actions">
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
  );
}
