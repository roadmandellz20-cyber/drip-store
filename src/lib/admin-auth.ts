const ADMIN_EMAIL_DEFAULT = "payedavid22@gmail.com";
const ADMIN_PASSWORD_DEFAULT = "@mugendistrict2026";
const ADMIN_SESSION_SECRET_DEFAULT = "mugen-district-admin-session-2026";
const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 12;

export const ADMIN_SESSION_COOKIE = "mugen_admin_session";

type AdminSessionPayload = {
  email: string;
  exp: number;
};

function getEncoder() {
  return new TextEncoder();
}

function getDecoder() {
  return new TextDecoder();
}

function normalizeBase64(value: string) {
  const padding = (4 - (value.length % 4 || 4)) % 4;
  return `${value.replace(/-/g, "+").replace(/_/g, "/")}${"=".repeat(padding)}`;
}

function bytesToBase64Url(bytes: Uint8Array) {
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const normalized = normalizeBase64(value);
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function encodePayload(value: string) {
  return bytesToBase64Url(getEncoder().encode(value));
}

function decodePayload(value: string) {
  return getDecoder().decode(base64UrlToBytes(value));
}

function getAdminEmail() {
  return (process.env.ADMIN_LOGIN_EMAIL?.trim().toLowerCase() || ADMIN_EMAIL_DEFAULT).toLowerCase();
}

function getAdminPassword() {
  return process.env.ADMIN_LOGIN_PASSWORD?.trim() || ADMIN_PASSWORD_DEFAULT;
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET?.trim() || ADMIN_SESSION_SECRET_DEFAULT;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

async function importSigningKey() {
  return crypto.subtle.importKey(
    "raw",
    getEncoder().encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signValue(value: string) {
  const key = await importSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, getEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function createAdminSession(email: string) {
  const payload: AdminSessionPayload = {
    email: normalizeEmail(email),
    exp: Date.now() + ADMIN_SESSION_TTL_MS,
  };
  const encodedPayload = encodePayload(JSON.stringify(payload));
  const signature = await signValue(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export async function verifyAdminSession(sessionCookie?: string | null) {
  if (!sessionCookie) return false;

  const [encodedPayload, providedSignature] = sessionCookie.split(".");
  if (!encodedPayload || !providedSignature) return false;

  const expectedSignature = await signValue(encodedPayload);
  if (providedSignature !== expectedSignature) return false;

  try {
    const payload = JSON.parse(decodePayload(encodedPayload)) as Partial<AdminSessionPayload>;
    if (normalizeEmail(payload.email || "") !== getAdminEmail()) return false;
    if (typeof payload.exp !== "number" || payload.exp <= Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export async function validateAdminCredentials(email: string, password: string) {
  return normalizeEmail(email) === getAdminEmail() && password === getAdminPassword();
}

export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(ADMIN_SESSION_TTL_MS / 1000),
  };
}

export function getDefaultAdminEmail() {
  return getAdminEmail();
}

export function getDefaultAdminPassword() {
  return getAdminPassword();
}

export function isSafeAdminRedirect(value?: string | null) {
  return typeof value === "string" && value.startsWith("/admin") && !value.startsWith("//");
}
