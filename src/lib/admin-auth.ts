const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 12;

export const ADMIN_SESSION_COOKIE = "mugen_admin_session";
export const ADMIN_CSRF_FORM_FIELD = "csrf_token";

type AdminSessionPayload = {
  email: string;
  exp: number;
};

type AdminEnvConfig = {
  email: string;
  passwordHash: string;
  sessionSecret: string;
};

type ParsedPasswordHash = {
  iterations: number;
  salt: Uint8Array;
  hash: Uint8Array;
};

function getEncoder() {
  return new TextEncoder();
}

function getDecoder() {
  return new TextDecoder();
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
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

function base64ToBytes(value: string) {
  const normalized = normalizeBase64(asString(value));
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function timingSafeEqualBytes(left: Uint8Array, right: Uint8Array) {
  const maxLength = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;

  for (let index = 0; index < maxLength; index += 1) {
    const leftByte = index < left.length ? left[index] : 0;
    const rightByte = index < right.length ? right[index] : 0;
    diff |= leftByte ^ rightByte;
  }

  return diff === 0;
}

function timingSafeEqualStrings(left: string, right: string) {
  return timingSafeEqualBytes(getEncoder().encode(left), getEncoder().encode(right));
}

function decodePayload(value: string) {
  return getDecoder().decode(base64ToBytes(value));
}

function readAdminEnvConfig(): AdminEnvConfig | null {
  const email = normalizeEmail(asString(process.env.ADMIN_LOGIN_EMAIL));
  const passwordHash = asString(process.env.ADMIN_PASSWORD_HASH);
  const sessionSecret = asString(process.env.ADMIN_SESSION_SECRET);

  if (!email || !passwordHash || !sessionSecret) {
    return null;
  }

  return {
    email,
    passwordHash,
    sessionSecret,
  };
}

function requireAdminEnvConfig() {
  const config = readAdminEnvConfig();
  if (!config) {
    throw new Error(
      "Missing required admin auth env vars: ADMIN_LOGIN_EMAIL, ADMIN_PASSWORD_HASH, ADMIN_SESSION_SECRET."
    );
  }
  return config;
}

async function importSigningKey(sessionSecret: string) {
  return crypto.subtle.importKey(
    "raw",
    getEncoder().encode(sessionSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function signValue(value: string, sessionSecret: string) {
  const key = await importSigningKey(sessionSecret);
  const signature = await crypto.subtle.sign("HMAC", key, getEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function parsePasswordHash(value: string): ParsedPasswordHash | null {
  const parts = asString(value).split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2_sha256") {
    return null;
  }

  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 100_000 || iterations > 2_000_000) {
    return null;
  }

  try {
    const salt = base64ToBytes(parts[2]);
    const hash = base64ToBytes(parts[3]);

    if (salt.length < 16 || hash.length < 32 || hash.length > 64) {
      return null;
    }

    return { iterations, salt, hash };
  } catch {
    return null;
  }
}

async function derivePasswordHash(password: string, parsed: ParsedPasswordHash) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    getEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(parsed.salt),
      iterations: parsed.iterations,
    },
    keyMaterial,
    parsed.hash.length * 8
  );

  return new Uint8Array(bits);
}

export function hasAdminAuthConfig() {
  return readAdminEnvConfig() !== null;
}

export async function createAdminSession(email: string) {
  const config = requireAdminEnvConfig();
  const payload: AdminSessionPayload = {
    email: normalizeEmail(email),
    exp: Date.now() + ADMIN_SESSION_TTL_MS,
  };

  const encodedPayload = bytesToBase64Url(getEncoder().encode(JSON.stringify(payload)));
  const signature = await signValue(encodedPayload, config.sessionSecret);

  return `${encodedPayload}.${signature}`;
}

export async function verifyAdminSession(sessionCookie?: string | null) {
  const config = readAdminEnvConfig();
  if (!config || !sessionCookie) {
    return false;
  }

  const [encodedPayload, providedSignature] = sessionCookie.split(".");
  if (!encodedPayload || !providedSignature) {
    return false;
  }

  const expectedSignature = await signValue(encodedPayload, config.sessionSecret);
  if (!timingSafeEqualStrings(providedSignature, expectedSignature)) {
    return false;
  }

  try {
    const payload = JSON.parse(decodePayload(encodedPayload)) as Partial<AdminSessionPayload>;
    if (normalizeEmail(asString(payload.email)) !== config.email) {
      return false;
    }

    if (typeof payload.exp !== "number" || payload.exp <= Date.now()) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function createAdminCsrfToken(sessionCookie?: string | null) {
  const config = readAdminEnvConfig();
  if (!config || !sessionCookie) {
    return "";
  }

  return signValue(`csrf:${sessionCookie}`, config.sessionSecret);
}

export async function verifyAdminCsrfToken(sessionCookie?: string | null, token?: string | null) {
  const normalizedToken = asString(token);
  if (!sessionCookie || !normalizedToken) {
    return false;
  }

  const expected = await createAdminCsrfToken(sessionCookie);
  if (!expected) {
    return false;
  }

  return timingSafeEqualStrings(normalizedToken, expected);
}

export async function validateAdminCredentials(email: string, password: string) {
  const config = readAdminEnvConfig();
  if (!config) {
    return false;
  }

  const parsed = parsePasswordHash(config.passwordHash);
  if (!parsed) {
    return false;
  }

  const derived = await derivePasswordHash(password, parsed);
  const passwordMatches = timingSafeEqualBytes(derived, parsed.hash);
  const emailMatches = timingSafeEqualStrings(normalizeEmail(email), config.email);

  return emailMatches && passwordMatches;
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

export function isSafeAdminRedirect(value?: string | null) {
  return typeof value === "string" && value.startsWith("/admin") && !value.startsWith("//");
}

function normalizeHost(value: string) {
  return value.trim().toLowerCase();
}

function getRequestHost(request: Request) {
  const hostHeader = asString(request.headers.get("host"));
  if (hostHeader) {
    return normalizeHost(hostHeader);
  }

  try {
    return normalizeHost(new URL(request.url).host);
  } catch {
    return "";
  }
}

function getCandidateHost(value: string) {
  try {
    return normalizeHost(new URL(value).host);
  } catch {
    return "";
  }
}

export function isSameOriginRequest(request: Request) {
  const requestHost = getRequestHost(request);
  if (!requestHost) {
    return false;
  }

  const originHeader = asString(request.headers.get("origin"));
  if (originHeader) {
    const originHost = getCandidateHost(originHeader);
    if (originHost && timingSafeEqualStrings(originHost, requestHost)) {
      return true;
    }
  }

  const refererHeader = asString(request.headers.get("referer"));
  if (refererHeader) {
    const refererHost = getCandidateHost(refererHeader);
    if (refererHost && timingSafeEqualStrings(refererHost, requestHost)) {
      return true;
    }
  }

  return false;
}
