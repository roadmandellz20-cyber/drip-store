import "server-only";

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { sanitizeIpInput, sanitizeSingleLineInput } from "@/lib/input";
import { supabaseAdmin } from "@/lib/supabase-admin";

type RateLimitRule = {
  scope: string;
  windowSeconds: number;
  maxRequests: number;
  blockSeconds?: number;
};

type RateLimitRpcRow = {
  allowed?: boolean;
  retry_after_seconds?: number;
  hit_count?: number;
};

type ConsumeOptions = {
  keyParts?: unknown[];
  increment?: boolean;
};

function asString(value: unknown) {
  return sanitizeSingleLineInput(value);
}

function normalizeKeyPart(value: unknown) {
  return sanitizeSingleLineInput(value, {
    lowercase: true,
    collapseWhitespace: false,
    maxLength: 160,
  });
}

export function getClientIp(request: Request) {
  const forwardedFor = asString(request.headers.get("x-forwarded-for"));
  if (forwardedFor) {
    return sanitizeIpInput(forwardedFor.split(",")[0] || "");
  }

  const realIp = asString(request.headers.get("x-real-ip"));
  if (realIp) {
    return sanitizeIpInput(realIp);
  }

  return "unknown";
}

function buildBucketKey(rule: RateLimitRule, request: Request, keyParts: unknown[] = []) {
  const ip = getClientIp(request);
  const normalizedParts = keyParts.map((part) => normalizeKeyPart(part)).filter(Boolean);
  const raw = [rule.scope, ip, ...normalizedParts].join(":");
  return createHash("sha256").update(raw).digest("hex");
}

export async function consumeRequestRateLimit(
  rule: RateLimitRule,
  request: Request,
  options: ConsumeOptions = {}
) {
  const increment = options.increment !== false;
  const bucketKey = buildBucketKey(rule, request, options.keyParts);

  try {
    const { data, error } = await supabaseAdmin.rpc("consume_rate_limit", {
      p_bucket_key: bucketKey,
      p_window_seconds: rule.windowSeconds,
      p_max_requests: rule.maxRequests,
      p_block_seconds: rule.blockSeconds ?? rule.windowSeconds,
      p_increment: increment,
    });

    if (error) {
      // Fail open if the rate-limit backend isn't ready yet so the storefront keeps working.
      console.error("[rate-limit] consume failed", {
        scope: rule.scope,
        message: error.message,
      });
      return { allowed: true, retryAfterSeconds: 0, hitCount: 0 };
    }

    const row = (Array.isArray(data) ? data[0] : data || {}) as RateLimitRpcRow;
    return {
      allowed: Boolean(row.allowed),
      retryAfterSeconds: Math.max(0, Math.ceil(Number(row.retry_after_seconds) || 0)),
      hitCount: Math.max(0, Math.floor(Number(row.hit_count) || 0)),
    };
  } catch (error) {
    console.error("[rate-limit] consume exception", {
      scope: rule.scope,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return { allowed: true, retryAfterSeconds: 0, hitCount: 0 };
  }
}

export async function clearRequestRateLimit(
  rule: RateLimitRule,
  request: Request,
  keyParts: unknown[] = []
) {
  const bucketKey = buildBucketKey(rule, request, keyParts);

  try {
    const { error } = await supabaseAdmin.from("request_rate_limits").delete().eq("bucket_key", bucketKey);
    if (error) {
      console.error("[rate-limit] clear failed", {
        scope: rule.scope,
        message: error.message,
      });
    }
  } catch (error) {
    console.error("[rate-limit] clear exception", {
      scope: rule.scope,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export function rateLimitJsonResponse(message: string, retryAfterSeconds: number) {
  return NextResponse.json(
    { ok: false, error: message },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, retryAfterSeconds || 1)),
        "Cache-Control": "no-store",
      },
    }
  );
}
