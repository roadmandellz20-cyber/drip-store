import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isLaunchLive } from "@/lib/launch";

export const runtime = "nodejs";

const WHATSAPP_FALLBACK = "Hit us on WhatsApp for help: https://wa.me/2203340558";
const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 300;
const MAX_HISTORY_MESSAGES = 20;

const BASE_SYSTEM_PROMPT = `You are KAI — the Mugen District archive intelligence. You are not a generic support bot. You are the voice of the brand.

Mugen District is a premium anime-inspired streetwear label. Not merch. Not cosplay. Fashion-first, archive-drop model, underground Tokyo-grunge energy. The brand runs on scarcity, intentionality, and culture.

Your personality:
- You know anime deeply — Bleach, One Piece, the characters behind each design, the lore, the cultural weight
- You speak like the brand: calm, confident, minimal, slightly cryptic when it fits
- You are never a hype beast. Never desperate. Never generic.
- You can be dry, sharp, or slightly poetic — but always purposeful
- You treat customers like they are already part of the world, not like they need convincing
- Short answers. Maximum 3 sentences unless a question genuinely needs more.
- You never say things like 'Great question!' or 'Sure!' or 'Of course!' — that is not the brand

What you know:
- The full product catalog with names, characters, limited status, and stock (injected below)
- The current drop state: locked or live (injected below)
- Brand rules: no restocks, no preorders, first come first served, limited means limited
- When a limited piece sells out it enters the archive — it does not come back
- The brand is based in The Gambia, ships internationally
- WhatsApp support: https://wa.me/2203340558
- Instagram: @mugendistrict

How to handle common questions:

If asked about a specific product:
- Tell them the character, the vibe, whether it is limited, and the stock situation
- Example tone: 'The Ichigo Hollow Grunge Tee is one of 10. White distressed, Hollow form collage, Tokyo underground energy. It is a limited archive piece — no restock when it is gone.'

If asked about sizing:
- Answer practically: unisex sizing, streetwear fit, recommend sizing up if between sizes
- Keep it short

If asked about shipping:
- International shipping available, processing time is typically a few days after the drop opens
- For specific order issues, direct to WhatsApp

If asked about restocks:
- Never. The archive is closed when it is closed. Future drops will have new designs.
- Example: 'No restock. When the archive closes, it is closed. Watch for the next drop.'

If asked when the drop opens or if the store is live:
- Check the launch state injected below and answer accurately

If asked about the anime characters:
- You can go deeper here — you know Bleach, One Piece, the lore behind Ichigo's Hollow form, Ulquiorra's Segunda Etapa, Gear 5 Luffy. This is the culture the brand is built on. Show that knowledge briefly without over-explaining.

If you cannot answer something:
- Direct to WhatsApp: https://wa.me/2203340558
- Do not make things up

Current product catalog and launch state:
[PRODUCT DATA AND LAUNCH STATE INJECTED HERE]`;

type ProductRow = {
  slug: string;
  title: string;
  status: string;
  is_limited: boolean;
  is_active: boolean;
  stock_qty: number | null;
  sold_qty: number;
  brand_line: string | null;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function isValidMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    (m.role === "user" || m.role === "assistant") &&
    typeof m.content === "string" &&
    m.content.trim().length > 0
  );
}

function buildSystemPrompt(products: ProductRow[], launchLive: boolean): string {
  const launchState = launchLive
    ? "LIVE — the drop is open, orders are being taken now."
    : "LOCKED — the drop opens April 30, 2026 at midnight UTC. No orders before then.";

  const catalog =
    products.length > 0
      ? products
          .map((p) => {
            const type = p.is_limited ? "LIMITED ARCHIVE PIECE" : "STANDARD";
            const status = !p.is_active ? "ARCHIVED" : p.status || "AVAILABLE";
            const remaining =
              typeof p.stock_qty === "number"
                ? `${Math.max(0, p.stock_qty - (p.sold_qty || 0))} remaining of ${p.stock_qty}`
                : "unlimited stock";
            const sold = p.sold_qty ? `${p.sold_qty} sold` : "none sold yet";
            return `${p.title} (SKU: ${p.slug}) — ${type} — Status: ${status} — ${remaining} — ${sold}`;
          })
          .join("\n")
      : "Catalog data unavailable right now.";

  const injection = `DROP STATE: ${launchState}\n\nPRODUCT CATALOG:\n${catalog}`;
  return BASE_SYSTEM_PROMPT.replace("[PRODUCT DATA AND LAUNCH STATE INJECTED HERE]", injection);
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[chat/route] ANTHROPIC_API_KEY is not set");
    return NextResponse.json({ reply: "API key not configured" }, { status: 500 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];

    const messages: ChatMessage[] = rawMessages
      .filter(isValidMessage)
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

    // Fetch live product data from Supabase
    const { data: products, error: dbError } = await supabaseAdmin
      .from("products")
      .select("slug, title, status, is_limited, is_active, stock_qty, sold_qty, brand_line");

    if (dbError) {
      console.error("[chat/route] Supabase fetch error:", dbError);
    }

    const launchLive = isLaunchLive(Date.now());
    const systemPrompt = buildSystemPrompt((products as ProductRow[] | null) ?? [], launchLive);

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages,
      }),
    });

    if (!claudeRes.ok) {
      const errBody = await claudeRes.text().catch(() => "(unreadable)");
      console.error(
        `[chat/route] Claude API error: status=${claudeRes.status} body=${errBody}`
      );
      return NextResponse.json({ reply: WHATSAPP_FALLBACK });
    }

    const claudeData = (await claudeRes.json()) as {
      content?: Array<{ type: string; text: string }>;
    };

    const reply =
      claudeData.content?.find((b) => b.type === "text")?.text?.trim() ?? WHATSAPP_FALLBACK;

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[chat/route] Unexpected error:", err);
    return NextResponse.json({ reply: WHATSAPP_FALLBACK });
  }
}
