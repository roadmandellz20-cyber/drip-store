// src/app/api/debug/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServerConfig, supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs"; // keep it simple

export async function GET() {
  const { url, key } = getSupabaseServerConfig();

  // Don’t leak secrets
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
