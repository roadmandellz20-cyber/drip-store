import { NextResponse } from "next/server";
import { fetchProductsWithInventory } from "@/lib/products-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slugs = searchParams
      .get("slugs")
      ?.split(",")
      .map((slug) => slug.trim().toLowerCase())
      .filter(Boolean);

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
    const message = error instanceof Error ? error.message : "Failed to load products.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
