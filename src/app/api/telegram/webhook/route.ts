export const runtime = "nodejs";

import { processAgentMessage } from "@/lib/mugenOpsAgent";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID ?? "";

async function sendMessage(chatId: number | string, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function uploadPhotoToSupabase(imageBuffer: Buffer, filename: string): Promise<string | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[telegram/webhook] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return null;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log("[telegram/webhook] Attempting upload to bucket: product-images, file:", filename);

  const { error } = await supabase.storage
    .from("product-images")
    .upload(filename, imageBuffer, { contentType: "image/jpeg", upsert: true });

  if (error) {
    console.error("[telegram/webhook] Storage upload error:", JSON.stringify(error));
    return null;
  }

  const { data: urlData } = supabase.storage
    .from("product-images")
    .getPublicUrl(filename);

  return urlData.publicUrl;
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

    const arrayBuffer = await downloadRes.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    const filename = `product-${Date.now()}.jpg`;
    return await uploadPhotoToSupabase(imageBuffer, filename);
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
      const reply = await processAgentMessage(caption, chatId, imageUrl);
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

  const reply = await processAgentMessage(message.text, chatId);
  await sendMessage(chatId, reply);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
