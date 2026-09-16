# On-prem / free-tier LLM — for the WhatsApp agent + avatar chatbot

**Status as of 2026-09-16: code is ready, VPS not yet created, Hugging Face
not yet configured.** Both the WhatsApp lead agent (`api/_lib/claude.js`)
and the in-app avatar chatbot (`api/avatar/chat.js`) now try, in order: a
self-hosted model, then Hugging Face's free router, then their existing
cloud vendor (NVIDIA NIM / Google Gemini). Until the relevant env vars are
set, each tier is a silent no-op and both callers fall straight through to
their cloud path — this is fully additive and safe to deploy on its own,
independent of the critical `wait`-undefined fix shipped in the same
change (see the top of `api/_lib/claude.js` for that one — it's unrelated
to this doc but landed together since both touch this file).

## Why three tiers

Every outage the lead agent and the avatar chatbot have had traced back to a
vendor changing something out from under us: Anthropic key/billing issues,
Mistral 403/429, NVIDIA retiring a whole model line (plus two wrong model-id
guesses while chasing it), Gemini retiring a free-tier model and then
throttling its replacement under demand. A self-hosted model removes that
whole failure class, at the cost of owning that box's uptime. Hugging
Face's free router is a middle ground: still a third-party vendor (so it
carries some of the same risk), but free-with-just-an-email and zero
infrastructure to run — worth having as a second attempt regardless of
whether the VPS ever gets built. Both are tried before the existing cloud
vendor, never instead of it.

## Tier 2: Hugging Face free tier — the fast path, do this first

1. Sign up at huggingface.co — email only, no payment method needed.
2. Create an access token at huggingface.co/settings/tokens with the "Make
   calls to Inference Providers" scope.
3. Pick a model + provider from huggingface.co/docs/inference-providers —
   the id is a `provider/model:backend` string, e.g.
   `meta-llama/Llama-3.1-8B-Instruct:novita`. Verify the exact current tag
   there; provider/model availability changes, and this app has been bitten
   before by guessing a model id instead of checking (see the comments in
   `api/_lib/claude.js`'s NVIDIA section for that whole saga) — which is why
   `HF_MODEL` has no hardcoded default in code.
4. Set in Vercel (Project Settings → Environment Variables, both Preview
   and Production): `HF_API_TOKEN`, `HF_MODEL`.
5. Optionally run `node scripts/_compare-onprem-models.mjs` first (see its
   header) to sanity-check Hebrew quality before committing to a model.

That's the whole setup — no server to create, no DNS, no bootstrap script.

## Tier 1: on-prem VPS — the durable fix, more setup

Creating a hosting account and paying for a server has to be you — account
creation and payment aren't things I can do on your behalf under any
circumstance. Everything else, I can do once the box exists.

1. Sign up with a VPS provider — Hetzner (cheapest, ~€4.5/mo for the CX22,
   4GB RAM) or DigitalOcean if you already have an account. Either works;
   both give you a browser-based console so no local terminal is needed.
2. Create an Ubuntu 22.04+ server, smallest/cheapest plan with at least
   4GB RAM.
3. In your DNS provider for celoxai.com (Namecheap, per
   `docs/whatsapp-agent.md`), add an **A record**: host `llm` → the new
   server's public IP. This is what lets the box get a real TLS certificate
   automatically.
4. Open the server's web console (or SSH in) as root, paste in the full
   contents of `scripts/onprem-vps-bootstrap.sh`, and run it:
   ```
   bash onprem-vps-bootstrap.sh
   ```
   It installs Ollama, pulls two candidate models, sets up Caddy as a
   TLS-terminating reverse proxy gated behind a bearer token, and opens only
   ports 22/80/443. It prints a URL + token at the end.
5. Set `ONPREM_LLM_URL` / `ONPREM_LLM_API_KEY` / `ONPREM_LLM_MODEL` in
   Vercel from what it printed.

## What happens after either is configured

Per house rules, this deploys to `dev` first and gets verified on
dev.celoxai.com before promoting to `main` — I'll ask before that promotion
the same way as every other change to this repo.

## What this does NOT change

- The cloud fallback (NVIDIA for the WhatsApp agent, Gemini for the avatar
  chatbot) stays fully wired. If both earlier tiers fail or are unset,
  everything works exactly as it did before any of this — see
  `api/_lib/onprem-llm.js` / `api/_lib/hf-llm.js` for exactly how the
  fallthrough works.
- Nothing about `conversation-script.js`, the Hebrew script content, the
  fact-only constraint (`celox-info.js` / `product-knowledge.js`), or any
  other agent behavior changes — only *which model answers* changes.

## Open item worth doing next, not yet done

`api/avatar/escalate.js` is still unauthenticated and unrate-limited
(TCEL-054 / item 3224391283 in this repo's own QA tracking). Flagging here
again since it's the same class of exposure as the webhook signature issue
fixed in this same change — worth fixing regardless of which LLM tier
answers, since an open uncapped endpoint is a real exposure whether it bills
a vendor account or eats a self-hosted box's own CPU.
