// src/app/api/debug/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // keep it simple

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  // Don’t leak secrets
  const anonPreview = anon ? `${anon.slice(0, 6)}...${anon.slice(-6)}` : "";

  if (!url || !anon) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing env vars",
        hasUrl: !!url,
        hasAnonKey: !!anon,
        url,
        anonPreview,
      },
      { status: 500 }
    );
  }

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
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