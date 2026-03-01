import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  isSafeAdminRedirect,
  verifyAdminSession,
} from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; redirect?: string }> | { error?: string; redirect?: string };
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const redirectPath = isSafeAdminRedirect(resolvedSearchParams.redirect)
    ? resolvedSearchParams.redirect || "/admin/orders"
    : "/admin/orders";
  const sessionCookie = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;

  if (await verifyAdminSession(sessionCookie)) {
    redirect(redirectPath);
  }

  const hasError = resolvedSearchParams.error === "invalid";

  return (
    <main className="page" style={{ maxWidth: 560 }}>
      <div className="page__head">
        <div className="page__kicker">Admin Access</div>
        <h1 className="page__title">AUTHORIZED LOGIN</h1>
        <p className="page__sub">Private orders console. Single-admin access only.</p>
      </div>

      <section className="panel">
        <div className="panel__line" />
        <div className="panel__body">
          <form className="checkout-form" action="/api/admin/login" method="post" autoComplete="off">
            <input type="hidden" name="redirect" value={redirectPath} />

            <label className="checkout-form__field">
              <span>Email</span>
              <input
                name="email"
                type="email"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                required
              />
            </label>

            <label className="checkout-form__field">
              <span>Password</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>

            {hasError ? (
              <div className="checkout__error">Invalid admin email or password.</div>
            ) : (
              <div className="checkout__note">Use the admin credentials to unlock the orders view.</div>
            )}

            <button className="btn btn--primary" type="submit">
              ENTER ADMIN →
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
