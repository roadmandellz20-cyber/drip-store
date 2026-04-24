import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_CSRF_FORM_FIELD,
  ADMIN_SESSION_COOKIE,
  createAdminCsrfToken,
  verifyAdminSession,
} from "@/lib/admin-auth";
import { sanitizeSingleLineInput } from "@/lib/input";
import { supabaseAdmin } from "@/lib/supabase-admin";
import OrdersClient, { type AdminOrder } from "./OrdersClient";

export const metadata: Metadata = {
  title: "Admin Orders",
  robots: {
    index: false,
    follow: false,
  },
};

function getStateMessage(state?: string) {
  if (state === "confirmed") return { tone: "ok" as const, text: "Order confirmed." };
  if (state === "cancelled") return { tone: "ok" as const, text: "Order cancelled." };
  if (state === "deleted") return { tone: "ok" as const, text: "Order deleted." };
  if (state === "locked") return { tone: "error" as const, text: "Completed orders are locked. Delete them instead." };
  if (state === "missing") return { tone: "error" as const, text: "Order not found." };
  if (state === "invalid") return { tone: "error" as const, text: "Invalid admin action." };
  if (state === "csrf") return { tone: "error" as const, text: "Security check failed. Try again." };
  if (state === "error") return { tone: "error" as const, text: "Admin action failed." };
  return null;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ state?: string }>;
}) {
  const sessionCookie = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  if (!(await verifyAdminSession(sessionCookie))) {
    redirect("/admin/login?redirect=/admin/orders");
  }

  const csrfToken = await createAdminCsrfToken(sessionCookie);
  if (!csrfToken) {
    redirect("/admin/login?redirect=/admin/orders");
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id,order_number,customer_name,customer_email,total_cents,currency,email_status,created_at,status")
    .order("created_at", { ascending: false });

  const orders: AdminOrder[] = ((data as Array<Record<string, unknown>> | null) ?? []).map((row) => ({
    id: sanitizeSingleLineInput(row.id),
    order_number: sanitizeSingleLineInput(row.order_number) || "(pending)",
    customer_name: sanitizeSingleLineInput(row.customer_name) || "—",
    customer_email: sanitizeSingleLineInput(row.customer_email) || "—",
    total_cents: typeof row.total_cents === "number" ? row.total_cents : 0,
    currency: sanitizeSingleLineInput(row.currency) || "GMD",
    status: sanitizeSingleLineInput(row.status, { lowercase: true }) || "pending",
    email_status: sanitizeSingleLineInput(row.email_status) || "—",
    created_at: sanitizeSingleLineInput(row.created_at),
  }));

  const stateMessage = getStateMessage(
    sanitizeSingleLineInput(resolvedSearchParams.state, { lowercase: true, maxLength: 32 })
  );

  return (
    <div className="page page--admin-wide">
      <div className="page__head">
        <h1 className="page__title">ORDERS</h1>
        <p className="page__sub">
          {error ? "Error loading orders." : `${orders.length} order${orders.length !== 1 ? "s" : ""} total.`}
        </p>
        <div className="page__actions">
          <form action="/api/admin/logout" method="post">
            <input type="hidden" name={ADMIN_CSRF_FORM_FIELD} value={csrfToken} />
            <button className="btn btn--ghost" type="submit">
              LOG OUT
            </button>
          </form>
        </div>
      </div>

      {error ? (
        <div className="checkout__error">Unable to load orders: {error.message}</div>
      ) : (
        <OrdersClient orders={orders} csrfToken={csrfToken} stateMessage={stateMessage} />
      )}
    </div>
  );
}
