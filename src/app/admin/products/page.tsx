import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSession,
} from "@/lib/admin-auth";
import { sanitizeSingleLineInput } from "@/lib/input";
import { supabaseAdmin } from "@/lib/supabase-admin";
import ProductsTable from "./ProductsTable";

export const metadata: Metadata = {
  title: "Admin Products",
  robots: { index: false, follow: false },
};

export type AdminProduct = {
  id: string;
  slug: string;
  title: string;
  is_limited: boolean;
  stock_qty: number | null;
  sold_qty: number;
  status: string;
  is_active: boolean;
  price_cents: number;
  soldOut: boolean;
};

export default async function AdminProductsPage() {
  const sessionCookie = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;

  if (!(await verifyAdminSession(sessionCookie))) {
    redirect("/admin/login?redirect=/admin/products");
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id,slug,title,is_limited,stock_qty,sold_qty,status,is_active,price_cents")
    .order("created_at", { ascending: true });

  const products: AdminProduct[] = ((data as Array<Record<string, unknown>> | null) ?? []).map(
    (row) => {
      const isLimited = Boolean(row.is_limited);
      const stockQty = typeof row.stock_qty === "number" ? row.stock_qty : null;
      const soldQty = typeof row.sold_qty === "number" ? row.sold_qty : 0;
      const available =
        isLimited && stockQty !== null ? Math.max(0, stockQty - soldQty) : null;

      return {
        id: sanitizeSingleLineInput(row.id),
        slug: sanitizeSingleLineInput(row.slug),
        title: sanitizeSingleLineInput(row.title),
        is_limited: isLimited,
        stock_qty: stockQty,
        sold_qty: soldQty,
        status: sanitizeSingleLineInput(row.status).toUpperCase() || "AVAILABLE",
        is_active: Boolean(row.is_active),
        price_cents: typeof row.price_cents === "number" ? row.price_cents : 0,
        soldOut: isLimited && available !== null && available <= 0,
      };
    }
  );

  return (
    <div className="page page--admin-wide">
      <div className="page__head">
        <h1 className="page__title">PRODUCTS</h1>
        <p className="page__sub">
          {products.length} product{products.length !== 1 ? "s" : ""} — edit inventory, status, and limited flags.
        </p>
      </div>
      {error ? (
        <div className="checkout__error">Unable to load products: {error.message}</div>
      ) : (
        <ProductsTable products={products} />
      )}
    </div>
  );
}
