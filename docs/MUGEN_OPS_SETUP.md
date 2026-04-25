# MUGEN OPS — Telegram Agent Setup

Private store intelligence agent for Mugen District. Phase 1: read-only store queries via Telegram.

## Setup

1. Go to Telegram, search **@BotFather**, send `/newbot`, follow the steps, copy the bot token
2. Add `TELEGRAM_BOT_TOKEN` to Vercel environment variables
3. Choose any random string for `TELEGRAM_WEBHOOK_SECRET`, add it to Vercel environment variables
4. Message **@userinfobot** on Telegram to get your chat ID, add it as `TELEGRAM_ADMIN_CHAT_ID` in Vercel environment variables
5. Deploy to Vercel first so the webhook URL is live
6. Run: `npm run register:webhook` to register the webhook with Telegram
7. Message your bot anything to test

## Environment Variables

| Variable | Where to get it |
|---|---|
| `TELEGRAM_BOT_TOKEN` | @BotFather on Telegram |
| `TELEGRAM_WEBHOOK_SECRET` | Any random string you choose |
| `TELEGRAM_ADMIN_CHAT_ID` | @userinfobot on Telegram |
| `ANTHROPIC_API_KEY` | Already configured |
| `SUPABASE_SERVICE_ROLE_KEY` | Already configured |

## Running the webhook registration

Make sure your `.env.local` has the Telegram variables set, then:

```bash
npm run register:webhook
```

This registers `https://mugendistrict.com/api/telegram/webhook?token=YOUR_SECRET` with Telegram.

## How it works

- Telegram sends messages to `/api/telegram/webhook`
- The route verifies the secret token and checks the chat ID matches the admin
- The message is passed to the MUGEN OPS agent which fetches live store data from Supabase
- Claude processes the message with full store context and replies via Telegram
- Only the authorized admin chat ID can interact with the bot
