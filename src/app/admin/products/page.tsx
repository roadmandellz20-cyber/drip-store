import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSession,
} from "@/lib/admin-auth";
import { normalizeAdminProductRow, type AdminProduct } from "@/lib/admin-products";
import { supabaseAdmin } from "@/lib/supabase-admin";
import ProductsTable from "./ProductsTable";

export const metadata: Metadata = {
  title: "Admin Products",
  robots: { index: false, follow: false },
};

export default async function AdminProductsPage() {
  const sessionCookie = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;

  if (!(await verifyAdminSession(sessionCookie))) {
    redirect("/admin/login?redirect=/admin/products");
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*");

  const products: AdminProduct[] = ((data as Array<Record<string, unknown>> | null) ?? [])
    .map((row) => normalizeAdminProductRow(row))
    .sort((left, right) => left.sort_order - right.sort_order || left.slug.localeCompare(right.slug));

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <h1 className="admin-page__title">PRODUCTS</h1>
          <p className="admin-page__sub">
            {products.length} product{products.length !== 1 ? "s" : ""} total
          </p>
        </div>
      </div>
      {error ? (
        <p className="admin-form__msg--error">Unable to load products: {error.message}</p>
      ) : (
        <ProductsTable products={products} />
      )}
    </div>
  );
}
