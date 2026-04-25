/**
 * One-time script to register the Telegram webhook.
 * Run: npm run register:webhook
 *
 * Requires these env vars (set in .env.local or shell):
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_WEBHOOK_SECRET
 *   WEBHOOK_BASE_URL (optional — defaults to https://mugendistrict.com)
 */

async function main() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const baseUrl = process.env.WEBHOOK_BASE_URL || "https://mugendistrict.com";

  if (!botToken) {
    console.error("Missing TELEGRAM_BOT_TOKEN");
    process.exit(1);
  }

  if (!webhookSecret) {
    console.error("Missing TELEGRAM_WEBHOOK_SECRET");
    process.exit(1);
  }

  const webhookUrl = `${baseUrl}/api/telegram/webhook?token=${encodeURIComponent(webhookSecret)}`;

  console.log("Registering webhook...");
  console.log("URL:", webhookUrl);

  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl, drop_pending_updates: true }),
    }
  );

  const data = await res.json();
  console.log("setWebhook response:", JSON.stringify(data, null, 2));

  if (!data.ok) {
    console.error("Failed to register webhook.");
    process.exit(1);
  }

  console.log("Webhook registered. Verifying...");

  const infoRes = await fetch(
    `https://api.telegram.org/bot${botToken}/getWebhookInfo`
  );
  const info = await infoRes.json();
  console.log("getWebhookInfo:", JSON.stringify(info, null, 2));
}

main();
