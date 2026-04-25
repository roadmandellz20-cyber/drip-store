export const runtime = "nodejs";

export async function POST(request: Request) {
  console.log("[telegram/webhook] RAW HIT");
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
