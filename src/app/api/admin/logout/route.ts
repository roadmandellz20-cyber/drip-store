import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_CSRF_FORM_FIELD,
  ADMIN_SESSION_COOKIE,
  getAdminCookieOptions,
  isSameOriginRequest,
  verifyAdminCsrfToken,
} from "@/lib/admin-auth";
import { sanitizeSingleLineInput } from "@/lib/input";

export const runtime = "nodejs";

function asString(value: FormDataEntryValue | null) {
  return sanitizeSingleLineInput(value);
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }

  const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const formData = await request.formData();
  const csrfToken = asString(formData.get(ADMIN_CSRF_FORM_FIELD));

  if (!(await verifyAdminCsrfToken(sessionCookie, csrfToken))) {
    return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
  }

  const response = NextResponse.redirect(new URL("/admin/login", request.url), { status: 303 });

  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...getAdminCookieOptions(),
    maxAge: 0,
  });

  return response;
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
