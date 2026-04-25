import { NextRequest, NextResponse } from "next/server";
import { processAgentMessage } from "@/lib/mugenOpsAgent";

export const runtime = "nodejs";

type TelegramUpdate = {
  message?: {
    chat?: { id?: number };
    text?: string;
  };
};

async function sendTelegramMessage(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });
  } catch (err) {
    console.error("[telegram/webhook] Failed to send message:", err);
  }
}

export async function POST(request: NextRequest) {
  console.log("[telegram/webhook] Received request:", request.method);

  // Verify webhook secret token
  const token = request.nextUrl.searchParams.get("token");
  const expectedToken = process.env.TELEGRAM_WEBHOOK_SECRET;

  console.log("[telegram/webhook] Token present:", !!token, "| Secret configured:", !!expectedToken, "| Match:", token === expectedToken);

  if (!expectedToken || token !== expectedToken) {
    console.log("[telegram/webhook] Token mismatch — returning 403");
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  try {
    const update = (await request.json()) as TelegramUpdate;
    const chatId = update.message?.chat?.id;
    const text = update.message?.text;

    if (!chatId || !text) {
      return NextResponse.json({ ok: true });
    }

    // Only respond to the authorized admin
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (!adminChatId || String(chatId) !== adminChatId) {
      return NextResponse.json({ ok: true });
    }

    // Process the message through the agent
    const reply = await processAgentMessage(text);
    await sendTelegramMessage(chatId, reply);
  } catch (err) {
    console.error("[telegram/webhook] Error processing update:", err);
  }

  // Always return 200 to Telegram
  return NextResponse.json({ ok: true });
}
