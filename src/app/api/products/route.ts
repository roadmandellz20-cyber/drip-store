import { NextResponse } from "next/server";
import { sanitizeSlugListInput } from "@/lib/input";
import { fetchProductsWithInventory } from "@/lib/products-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slugs = sanitizeSlugListInput(searchParams.get("slugs"));

    const products = await fetchProductsWithInventory(slugs);

    return NextResponse.json(
      { products },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("[api/products] failed", error);
    return NextResponse.json({ error: "Failed to load products." }, { status: 500 });
  }
}
