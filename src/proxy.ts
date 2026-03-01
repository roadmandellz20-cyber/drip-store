import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  isSafeAdminRedirect,
  verifyAdminSession,
} from "@/lib/admin-auth";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const isAuthenticated = await verifyAdminSession(sessionCookie);
  const isLoginPath = pathname === "/admin/login";

  if (isAuthenticated && isLoginPath) {
    const redirectParam = request.nextUrl.searchParams.get("redirect");
    const redirectPath = isSafeAdminRedirect(redirectParam)
      ? redirectParam || "/admin/orders"
      : "/admin/orders";
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  if (isAuthenticated || isLoginPath) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("redirect", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};
