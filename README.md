# ClearView Glass Repair — Twilio Intake System

Twilio Voice + SMS/MMS lead intake + operator dashboard.

## Architecture

- **Server**: Node.js + Express + TypeScript (tsx)
- **DB**: PostgreSQL + Drizzle ORM (auto-migrated on startup)
- **Frontend**: React 18 + Vite + Tailwind CSS (served from server)
- **AI summaries**: Claude Haiku (optional)
- **Deploy target**: Burrow Path B (server on `burrowapps.com`)

## Environment variables

Create `/data/glass-repair-intake-6f3c/.env` with:

```env
# Twilio — find in Twilio Console
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

# Public URL of this server (for Twilio webhook sig verification)
TWILIO_WEBHOOK_BASE_URL=https://syucollabadd-glass-repair-intake-6f3c.burrowapps.com

# PostgreSQL connection string
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Dashboard password (any strong string)
DASHBOARD_TOKEN=change-me-to-a-long-random-secret

# Optional: Claude AI summaries on quote-ready leads
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx

PORT=8022
NODE_ENV=production
```

## Twilio Console setup

1. **Phone number** → Configure the inbound call webhook:
   - Voice URL: `https://syucollabadd-glass-repair-intake-6f3c.burrowapps.com/api/voice`
   - Method: `HTTP POST`

2. **Messaging Service** or direct phone number → Configure inbound SMS webhook:
   - Messaging URL: `https://syucollabadd-glass-repair-intake-6f3c.burrowapps.com/api/sms`
   - Method: `HTTP POST`

3. **Status Callback** (on your Twilio number or messaging service):
   - URL: `https://syucollabadd-glass-repair-intake-6f3c.burrowapps.com/api/status-callback`

## API routes

| Route | Auth | Description |
|---|---|---|
| `POST /api/voice` | Twilio sig | TwiML greeting + trigger intro SMS |
| `POST /api/sms` | Twilio sig | Process inbound SMS/MMS |
| `POST /api/status-callback` | Twilio sig | Update message delivery status |
| `GET /api/leads` | Bearer | List all leads |
| `GET /api/leads/:id` | Bearer | Full lead detail + message thread |
| `POST /api/leads/:id/reply` | Bearer | Send operator SMS reply |
| `GET /api/media/:sid` | Bearer | Proxied Twilio media (no credentials in browser) |
| `GET /health` | — | Health check |

## Intake routing logic

| Trigger | Outcome | Reply |
|---|---|---|
| STOP / STOPALL / UNSUBSCRIBE / CANCEL / END / QUIT | opted-out | — (Twilio compliance) |
| HELP / INFO | no status change | Program info SMS |
| "human", "emergency", "break in", "unsafe", etc. | handoff | Urgent flag reply |
| Photo only | waiting | Ask for suburb/postcode |
| Suburb/postcode only | waiting | Ask for photo |
| Photo + suburb/postcode | ready-for-quote | AI summary generated |
| Message to opted-out caller | ignored | — |

Idempotency: every Twilio webhook is de-duped by `MessageSid`/`CallSid` via the `integration_events` table.

## Production smoke-test checklist

- [ ] Call the Twilio number → hear greeting → receive intro SMS within 5s
- [ ] Reply with only a photo → receive "what suburb/postcode?" reply
- [ ] Reply with suburb+postcode → lead shows "Ready for Quote" in dashboard
- [ ] Reply STOP → no further outbound SMS; dashboard shows opted-out
- [ ] Reply HELP → receive program info SMS
- [ ] Reply "need a human" → lead shows Handoff badge
- [ ] Operator reply from dashboard → customer receives SMS
- [ ] Operator reply to opted-out lead → blocked with 403
- [ ] Call the same number again → no duplicate SMS (idempotency)
- [ ] Photo thumbnail visible in dashboard (proxied, no Twilio URL exposed)
- [ ] `/health` returns `{"status":"ok"}`

## Development

```bash
# Start server (watches for changes)
npm run dev:server

# Start Vite frontend (proxies /api to server)
npm run dev:client

# Run unit tests
npm test
```

## Deploy

```bash
# Rebuild frontend after UI changes
npm run build

# (Re)deploy server with pm2
burrow-deploy 'npx tsx server/index.ts'
```
