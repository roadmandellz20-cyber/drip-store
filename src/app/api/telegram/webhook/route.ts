export const runtime = "nodejs";

import { processAgentMessage } from "@/lib/mugenOpsAgent";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID ?? "";
const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function sendMessage(chatId: number | string, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function uploadPhotoToSupabase(fileBuffer: ArrayBuffer, filename: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;

  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/product-images/${filename}`;
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "image/jpeg",
      "x-upsert": "true",
    },
    body: fileBuffer,
  });

  if (!res.ok) {
    console.error("[telegram/webhook] Supabase upload failed", res.status, await res.text().catch(() => ""));
    return null;
  }

  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${filename}`;
}

async function handlePhoto(photo: Array<{ file_id: string; file_size?: number }>): Promise<string | null> {
  try {
    const largest = photo[photo.length - 1];
    const fileRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${largest.file_id}`
    );
    const fileData = (await fileRes.json()) as { ok: boolean; result?: { file_path: string } };
    if (!fileData.ok || !fileData.result?.file_path) return null;

    const downloadRes = await fetch(
      `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`
    );
    if (!downloadRes.ok) return null;

    const buffer = await downloadRes.arrayBuffer();
    const filename = `product-${Date.now()}.jpg`;
    return await uploadPhotoToSupabase(buffer, filename);
  } catch (err) {
    console.error("[telegram/webhook] Photo handling error:", err);
    return null;
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!WEBHOOK_SECRET || token !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const update = body as {
    message?: {
      chat: { id: number };
      from?: { id: number };
      text?: string;
      caption?: string;
      photo?: Array<{ file_id: string; file_size?: number }>;
    };
  };

  const message = update.message;
  if (!message) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const chatId = message.chat.id;

  if (ADMIN_CHAT_ID && String(chatId) !== String(ADMIN_CHAT_ID)) {
    await sendMessage(chatId, "Access denied.");
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Handle photo messages
  if (message.photo && message.photo.length > 0) {
    const imageUrl = await handlePhoto(message.photo);
    const caption = message.caption?.trim() || "I just sent an image. What should I do with it?";

    if (!imageUrl) {
      await sendMessage(chatId, "Image received but upload to storage failed. Check that the product-images bucket exists in Supabase.");
    } else {
      const reply = await processAgentMessage(caption, imageUrl);
      await sendMessage(chatId, reply);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Handle text messages
  if (!message.text) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const reply = await processAgentMessage(message.text);
  await sendMessage(chatId, reply);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
