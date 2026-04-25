import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/admin-auth";
import { normalizeAdminProductRow } from "@/lib/admin-products";
import { sanitizeSlugInput } from "@/lib/input";
import { supabaseAdmin } from "@/lib/supabase-admin";
import ProductForm from "../ProductForm";

export const metadata: Metadata = {
  title: "Edit Admin Product",
  robots: { index: false, follow: false },
};

export default async function EditAdminProductPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const sessionCookie = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;

  if (!(await verifyAdminSession(sessionCookie))) {
    const resolvedParams = await params;
    redirect(`/admin/login?redirect=/admin/products/${encodeURIComponent(resolvedParams.sku)}`);
  }

  const resolvedParams = await params;
  const slug = sanitizeSlugInput(resolvedParams.sku, 64);

  const { data, error } = await supabaseAdmin.from("products").select("*").eq("slug", slug).maybeSingle();

  if (error || !data) {
    return (
      <div className="admin-page">
        <div className="admin-page__head">
          <div>
            <h1 className="admin-page__title">PRODUCT NOT FOUND</h1>
            <p className="admin-page__sub">That product could not be loaded.</p>
          </div>
        </div>
      </div>
    );
  }

  const product = normalizeAdminProductRow(data as Record<string, unknown>);

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <h1 className="admin-page__title">EDIT PRODUCT</h1>
          <p className="admin-page__sub">{product.slug}</p>
        </div>
      </div>

      <ProductForm mode="edit" product={product} />
    </div>
  );
}
