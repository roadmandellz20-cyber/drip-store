import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "Endpoint deprecated. Use /api/orders/create." },
    {
      status: 410,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
