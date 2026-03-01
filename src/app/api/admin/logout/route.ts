import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, getAdminCookieOptions } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/admin/login", request.url));

  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...getAdminCookieOptions(),
    maxAge: 0,
  });

  return response;
}
