import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/admin-auth";
import ProductForm from "../ProductForm";

export const metadata: Metadata = {
  title: "New Admin Product",
  robots: { index: false, follow: false },
};

export default async function NewAdminProductPage() {
  const sessionCookie = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;

  if (!(await verifyAdminSession(sessionCookie))) {
    redirect("/admin/login?redirect=/admin/products/new");
  }

  return (
    <div className="page page--admin-wide">
      <div className="page__head">
        <h1 className="page__title">NEW PRODUCT</h1>
        <p className="page__sub">Create a live catalog product without touching code.</p>
      </div>

      <ProductForm mode="create" />
    </div>
  );
}
