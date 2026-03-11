import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  isSafeAdminRedirect,
  verifyAdminSession,
} from "@/lib/admin-auth";

const isProduction = process.env.NODE_ENV === "production";

function buildCsp(nonce: string) {
  const connectSrc = ["'self'", "https://*.supabase.co", "https://api.resend.com"];

  if (!isProduction) {
    connectSrc.push("http://127.0.0.1:*", "http://localhost:*", "ws://127.0.0.1:*", "ws://localhost:*");
  }

  const scriptSrc = [`'self'`, `'nonce-${nonce}'`];
  if (!isProduction) {
    scriptSrc.push("'unsafe-eval'");
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src ${connectSrc.join(" ")}`,
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    isProduction ? "upgrade-insecure-requests" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function nextWithCsp(request: NextRequest) {
  const accept = request.headers.get("accept") || "";
  if (!accept.includes("text/html")) {
    return NextResponse.next();
  }

  const nonce = btoa(crypto.randomUUID()).replace(/=+$/g, "");
  const contentSecurityPolicy = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return nextWithCsp(request);
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
    return nextWithCsp(request);
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("redirect", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
