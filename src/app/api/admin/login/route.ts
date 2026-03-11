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

export const runtime = "nodejs";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;

type LoginAttemptState = {
  count: number;
  resetAt: number;
  blockedUntil: number;
};

const loginAttemptLog = new Map<string, LoginAttemptState>();

function asString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeIp(ip: string) {
  const raw = ip.trim();
  if (!raw) return "unknown";
  return raw.startsWith("::ffff:") ? raw.slice(7) : raw;
}

function getClientIp(request: Request) {
  const forwardedFor = asString(request.headers.get("x-forwarded-for"));
  if (forwardedFor) {
    return normalizeIp(forwardedFor.split(",")[0] || "");
  }

  const realIp = asString(request.headers.get("x-real-ip"));
  if (realIp) {
    return normalizeIp(realIp);
  }

  return "unknown";
}

function getAttemptState(ip: string, now = Date.now()) {
  const state = loginAttemptLog.get(ip);
  if (!state) {
    return null;
  }

  if (state.resetAt <= now && state.blockedUntil <= now) {
    loginAttemptLog.delete(ip);
    return null;
  }

  if (state.resetAt <= now) {
    state.count = 0;
    state.resetAt = now + LOGIN_WINDOW_MS;
  }

  return state;
}

function getRetryAfterSeconds(state: LoginAttemptState, now = Date.now()) {
  if (state.blockedUntil <= now) return 0;
  return Math.max(1, Math.ceil((state.blockedUntil - now) / 1000));
}

function registerFailedAttempt(ip: string, now = Date.now()) {
  const state =
    getAttemptState(ip, now) ||
    ({ count: 0, resetAt: now + LOGIN_WINDOW_MS, blockedUntil: 0 } satisfies LoginAttemptState);

  state.count += 1;

  if (state.count >= LOGIN_MAX_ATTEMPTS) {
    state.blockedUntil = now + LOGIN_WINDOW_MS;
  }

  loginAttemptLog.set(ip, state);
  return getRetryAfterSeconds(state, now);
}

function clearFailedAttempts(ip: string) {
  loginAttemptLog.delete(ip);
}

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

  const ip = getClientIp(request);
  const now = Date.now();
  const state = getAttemptState(ip, now);
  const blockedSeconds = state ? getRetryAfterSeconds(state, now) : 0;
  if (blockedSeconds > 0) {
    return tooManyAttemptsResponse(blockedSeconds);
  }

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
    const retryAfter = registerFailedAttempt(ip, now);
    if (retryAfter > 0) {
      return tooManyAttemptsResponse(retryAfter);
    }

    loginUrl.searchParams.set("error", "invalid");
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  clearFailedAttempts(ip);

  const response = NextResponse.redirect(
    new URL(isSafeAdminRedirect(redirectPath) ? redirectPath : "/admin/orders", request.url),
    { status: 303 }
  );
  const session = await createAdminSession(email);

  response.cookies.set(ADMIN_SESSION_COOKIE, session, getAdminCookieOptions());

  return response;
}
