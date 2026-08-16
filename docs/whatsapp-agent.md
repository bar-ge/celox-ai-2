# CELOX AI — WhatsApp lead agent + dashboard

A WhatsApp AI agent that qualifies inbound leads in Hebrew and books meetings,
plus an internal dashboard at **wab.celoxai.com**.

The agent is not a support bot and not a closer. It runs a fixed Hebrew script,
answers questions from a closed knowledge base, and always returns the
conversation to the next unanswered script question.

## Status

- [x] Phase 1: Schema + shared lib modules
- [x] Phase 2: WhatsApp Cloud API webhook + send/read helpers
- [x] Phase 3: AI agent, system prompt, conversation state
- [x] Phase 4: Calendly availability + confirmed booking
- [x] Phase 5: Dashboard UI
- [x] Phase 6: Realtime, follow-up cron, self-tests
- [ ] Live end-to-end test against the real WhatsApp number (needs credentials in Vercel)

## Architecture

This is additive to the existing Vite + React + Supabase app. It does **not**
introduce Next.js: the API routes are Vercel serverless functions under `api/`,
and the dashboard is a lazy-loaded React screen inside the existing app.

```
api/
  _lib/                      shared, never routed (leading underscore)
    celox-info.js            company facts
    product-knowledge.js     the agent's entire factual world
    conversation-script.js   spec sections 1–24, verbatim Hebrew
    system-prompt.js         composes the prompt from the pieces + lead state
    conversation-state.js    stage/status types, resume logic, status derivation
    intents.js               intent taxonomy + colours (shared with the UI)
    supabase.js              service-role client
    whatsapp.js              Cloud API send / read receipt / payload parsing
    claude.js                Messages API wrapper, strict JSON parsing, retry
    calendly.js              real availability + single-use booking links
    crm.js                   lead upsert, field merge, message log, history
    followups.js             follow-up timing + wording
    auth.js                  master-only gate for the dashboard routes
  wa/
    webhook.js               GET verify + POST messages
    leads.js                 GET all leads with rollup; PATCH ?phone= for manual controls
    messages.js              GET ?phone= — one thread
    send-booking.js          POST — dashboard quick booking
    leads/[phone].js         dead — see the routing note below
    messages/[phone].js      dead — see the routing note below
  cron/
    wa-followups.js          hourly follow-up sweep

src/wab/                     dashboard (lazy-loaded from App.jsx)
  WaDashboard.jsx  ConversationList.jsx  ThreadView.jsx  LeadDetail.jsx
  MessageBubble.jsx  StageBadge.jsx  IntentTag.jsx  theme.js  api.js
```

### Message flow

1. Meta posts to `/api/wa/webhook`. The signature is verified, the payload
   parsed, and non-message events (delivery receipts, reactions) dropped.
2. The lead row is loaded or created, then the inbound message is inserted.
   `wab_messages.wa_message_id` is unique, so a redelivered message fails the
   insert and processing stops — that is the dedupe.
3. `200 OK` goes back to Meta immediately; everything after runs in
   `waitUntil()` so a slow model call can never time the webhook out.
4. If `bot_paused` or `opted_out`, the message is logged and nothing is sent.
5. The last 6 turns plus the full lead row go into the system prompt, so the
   agent knows what has already been answered and where to resume.
6. Claude returns JSON only. It is parsed defensively (fences stripped, one
   retry, runtime type guard). On failure the lead gets a Hebrew fallback and
   the raw response is logged.
7. Extracted fields are merged — a `null` never clears an existing value.
   Stage and status are updated, open questions appended.
8. The reply is logged and sent.

### Booking

Calendly has no public "create invitee" endpoint, so a confirmed slot is booked
by sending the **single-use scheduling URL** Calendly returns with that slot.

Availability is only fetched once the lead is qualified or the conversation has
reached the meeting stages. The model is given the real slots with a machine id
and must echo one back in `selected_slot` when the lead confirms. That id is
re-validated against live availability before `meeting_at` is written — if the
slot has gone, the agent says so and offers fresh times instead of faking it.
If Calendly is unreachable it says so and hands off to a human.

### Follow-ups

Daily cron at 07:00 UTC — 10:00 Israel in summer, 09:00 in winter, so it always
lands inside business hours. The route re-checks SUN–THU 09:00–17:00
Asia/Jerusalem itself and no-ops outside them, so Friday and Saturday runs send
nothing.

A follow-up fires only when the last message was ours, the bot is not paused,
the lead has not opted out and no meeting is booked. Three at most, on
consecutive business mornings. Each one resumes the exact script question the
lead never answered, taken from a static map — never a model call, never a
restart. After the third, status becomes `לא הגיב` and nothing more is sent.

The delays (4h / 20h / 20h) are deliberately under a day: with one tick per
morning, a 22h+ delay would slip each follow-up to the morning after the one it
belongs to. If the project ever moves to a paid Vercel plan, changing the
schedule to `0 * * * *` gives the spec's original ~4h-then-next-day cadence with
no other change.

## Data model

Two new tables. The pre-existing `wa_conversations` / `wa_messages` /
`wa_agent_settings` tables (Twilio-shaped, unused) are untouched.

- `wab_leads` — one row per phone, mirrors spec section 22. Stage and status are
  constrained to the 14 stages and 12 statuses, so an invalid value is rejected
  by the database rather than silently stored.
- `wab_messages` — every inbound and outbound message, with intent and stage.
  Intent is stored on inbound rows only (plus `booking_request` on a manually
  sent booking link).

RLS is on for both, master-only via the existing `is_master()` function. The
serverless functions use the service role key and bypass RLS, so they
authenticate the caller themselves (`api/_lib/auth.js`).

Both tables are in the `supabase_realtime` publication, which is what drives the
live dashboard.

## Environment variables

Server-side only — none of these may ever get a `VITE_` prefix.

| Name | Purpose |
|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | Cloud API sender |
| `WHATSAPP_ACCESS_TOKEN` | Cloud API token |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | GET handshake |
| `WHATSAPP_APP_SECRET` | optional; verifies `X-Hub-Signature-256` |
| `CALENDLY_API_KEY` | personal access token |
| `CALENDLY_EVENT_URL` | scheduling URL of the event type to book |
| `ANTHROPIC_API_KEY` | Messages API |
| `ANTHROPIC_MODEL` | optional; defaults to `claude-sonnet-5` |
| `SUPABASE_URL` | falls back to `VITE_SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | server writes, bypasses RLS |
| `MASTER_EMAIL` | gates the dashboard API; must match `VITE_MASTER_EMAIL` |
| `CRON_SECRET` | set by Vercel when Cron is enabled |

## Deployment

1. Add every variable above in Vercel → Settings → Environment Variables, for
   **Preview** (dev.celoxai.com) first, then Production.
2. Add `wab.celoxai.com` to the `my-fleet-app` project's domains and point the
   DNS record at Vercel. The dashboard is also reachable at `/wab` on any host,
   which is how to test it on a preview deployment.
3. In Meta → WhatsApp → Configuration, set the callback URL to
   `https://celoxai.com/api/wa/webhook` and the verify token to
   `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, then subscribe to the `messages` field.
4. The cron in `vercel.json` runs once a day at 07:00 UTC, which is what the
   free plan allows. No action needed.
5. Only the master account can open the dashboard or call its API routes.

## Tests

`npm run test:wa` — 27 checks over payload parsing, the JSON contract, stage
resume logic, status derivation, history normalisation, follow-up timing and
the composed system prompt. No network, no API keys.

## Routing note — no `[param]` files

Vercel's bare `api/` directory convention on this Vite project does **not** deploy
`[param]` files as functions. That is a Next.js feature; here the files are
simply never built, and the request falls through to the SPA rewrite in
`vercel.json`, so `/api/wa/messages/+9725…` answers `200 text/html` with
`index.html` instead of JSON.

It fails silently — the build is green and the endpoint "responds" — so it was
only caught by probing the deployed routes and noticing the content type.

Everything therefore takes the phone number as a query parameter:
`/api/wa/messages?phone=…` and `PATCH /api/wa/leads?phone=…`.

`api/wa/leads/[phone].js` and `api/wa/messages/[phone].js` are dead code kept
only because this repo's rule 1 forbids deleting without asking. They are not
routed and not imported; delete them whenever you want.

## Known deviations from the original spec

- **Stack.** The spec asked for Next.js 14 + TypeScript + Tailwind. This is the
  existing Vite + React + plain-JS app instead, per Bar's decision to add to
  celox-ai-2 rather than stand up a second toolchain. Types are expressed as
  JSDoc typedefs with runtime guards, which is what actually protects the data
  here — the model's output is validated at the boundary either way.
- **`selected_slot`.** One optional field was added to the agent's JSON contract
  so a confirmed booking can be verified against live availability instead of
  inferred from the reply text.
- **Responsive.** The spec asked for a desktop-only dashboard with a "use a wider
  screen" message below 1024px. Repo rule 5 wins instead: the screen adapts.
  ≥1280 is the three-column layout; 768–1279 drops to list + thread with lead
  details as a panel over the thread; below 768 it is one pane at a time with
  back navigation, 44px touch targets and 16px inputs (which stops iOS Safari
  zooming on focus).
- **Table names.** `wab_leads` / `wab_messages`, so the unused Twilio-era `wa_*`
  tables stay untouched.
