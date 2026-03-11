import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/admin-auth";
import { getSupabaseServerConfig, supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isDebugRouteEnabled() {
  const enabled = asString(process.env.ENABLE_DEBUG_ROUTES).toLowerCase();
  return process.env.NODE_ENV !== "production" && enabled === "true";
}

async function requireDebugAccess(request: NextRequest) {
  if (!isDebugRouteEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!(await verifyAdminSession(sessionCookie))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

export async function GET(request: NextRequest) {
  const denied = await requireDebugAccess(request);
  if (denied) {
    return denied;
  }

  const { url, key } = getSupabaseServerConfig();
  const serviceRole = asString(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const anonPreview = key ? `${key.slice(0, 6)}...${key.slice(-6)}` : "";

  if (!url || !key) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing env vars",
        hasUrl: !!url,
        hasAnonKey: !!key,
        url,
        anonPreview,
      },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseServer
    .from("products")
    .select("id, slug, is_active, category_id")
    .eq("is_active", true)
    .limit(10);

  return NextResponse.json({
    ok: !error,
    urlHost: safeHost(url),
    url,
    anonPreview,
    hasServiceRole: !!serviceRole,
    count: data?.length ?? 0,
    first: data?.map((p) => ({ slug: p.slug, hasCategory: !!p.category_id })) ?? [],
    error: error ?? null,
  });
}

function safeHost(u: string) {
  try {
    return new URL(u).host;
  } catch {
    return "invalid-url";
  }
}
