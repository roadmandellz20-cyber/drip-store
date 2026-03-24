import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSession,
  getAdminCookieOptions,
  hasAdminAuthConfig,
  isSafeAdminRedirect,
  isSameOriginRequest,
  validateAdminCredentials,
} from "@/lib/admin-auth";
import {
  clearRequestRateLimit,
  consumeRequestRateLimit,
} from "@/lib/request-rate-limit";
import {
  sanitizeEmailInput,
  sanitizePasswordInput,
  sanitizeSingleLineInput,
} from "@/lib/input";

export const runtime = "nodejs";

const LOGIN_WINDOW_SECONDS = 15 * 60;
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_RATE_LIMIT = {
  scope: "admin-login",
  windowSeconds: LOGIN_WINDOW_SECONDS,
  maxRequests: LOGIN_MAX_ATTEMPTS,
  blockSeconds: LOGIN_WINDOW_SECONDS,
} as const;

function tooManyAttemptsResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "Too many login attempts. Try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }

  if (!hasAdminAuthConfig()) {
    return NextResponse.json(
      { error: "Admin auth is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const preflightRateLimit = await consumeRequestRateLimit(LOGIN_RATE_LIMIT, request, {
    increment: false,
  });
  if (!preflightRateLimit.allowed) {
    return tooManyAttemptsResponse(preflightRateLimit.retryAfterSeconds);
  }

  const formData = await request.formData();
  const email = sanitizeEmailInput(formData.get("email"));
  const password = sanitizePasswordInput(formData.get("password"));
  const redirectPath = sanitizeSingleLineInput(formData.get("redirect"), {
    collapseWhitespace: false,
    maxLength: 256,
  });
  const loginUrl = new URL("/admin/login", request.url);

  if (!isSafeAdminRedirect(redirectPath)) {
    loginUrl.searchParams.set("redirect", "/admin/orders");
  } else {
    loginUrl.searchParams.set("redirect", redirectPath);
  }

  if (!(await validateAdminCredentials(email, password))) {
    const failedAttempt = await consumeRequestRateLimit(LOGIN_RATE_LIMIT, request);
    if (!failedAttempt.allowed) {
      return tooManyAttemptsResponse(failedAttempt.retryAfterSeconds);
    }

    loginUrl.searchParams.set("error", "invalid");
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  await clearRequestRateLimit(LOGIN_RATE_LIMIT, request);

  const response = NextResponse.redirect(
    new URL(isSafeAdminRedirect(redirectPath) ? redirectPath : "/admin/orders", request.url),
    { status: 303 }
  );
  const session = await createAdminSession(email);

  response.cookies.set(ADMIN_SESSION_COOKIE, session, getAdminCookieOptions());

  return response;
}
