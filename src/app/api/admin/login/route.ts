import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSession,
  getAdminCookieOptions,
  isSafeAdminRedirect,
  validateAdminCredentials,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

function asString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = asString(formData.get("email"));
  const password = asString(formData.get("password"));
  const redirectPath = asString(formData.get("redirect"));
  const loginUrl = new URL("/admin/login", request.url);

  if (!isSafeAdminRedirect(redirectPath)) {
    loginUrl.searchParams.set("redirect", "/admin/orders");
  } else {
    loginUrl.searchParams.set("redirect", redirectPath);
  }

  if (!(await validateAdminCredentials(email, password))) {
    loginUrl.searchParams.set("error", "invalid");
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  const response = NextResponse.redirect(
    new URL(isSafeAdminRedirect(redirectPath) ? redirectPath : "/admin/orders", request.url),
    { status: 303 }
  );
  const session = await createAdminSession(email);

  response.cookies.set(ADMIN_SESSION_COOKIE, session, getAdminCookieOptions());

  return response;
}
