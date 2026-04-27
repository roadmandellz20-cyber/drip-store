# MUGEN OPS — Telegram Agent Setup

Private store intelligence agent for Mugen District. Phase 3: full read/write store management, image upload, bulk ops, undo system, coming soon, and GitHub code push via Telegram.

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

## Phase 3 — Additional Manual Setup

### Supabase Storage (for image uploads)

1. Go to Supabase dashboard → Storage → New bucket
2. Name: `product-images`
3. Public: **true**
4. This bucket stores all product images uploaded via Telegram
5. Images are auto-uploaded when you send a photo to the bot

### GitHub Token (for code push capability)

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate a new token with `repo` scope (full repo read/write)
3. Add to Vercel: `GITHUB_TOKEN`, `GITHUB_OWNER` (your username), `GITHUB_REPO` (drip-store)
4. Tell the bot "create the coming soon page" to push directly from Telegram

### mugen_ops_log table

Already applied via migration `20260427_mugen_ops_log.sql`. Stores full audit log of every write operation with before/after values for undo/revert.

## How it works

- Telegram sends messages or photos to `/api/telegram/webhook`
- Photos are downloaded from Telegram, uploaded to Supabase Storage, and the URL is passed to the agent
- Text messages are passed directly to the agent
- The agent fetches live store data from Supabase and calls Groq (llama-3.3-70b) for intelligence
- Write operations emit an `[ACTION:tool|params]` tag which is parsed, executed, and logged
- All write operations are logged to `mugen_ops_log` for full undo/revert capability
- Only the authorized admin chat ID can interact with the bot
