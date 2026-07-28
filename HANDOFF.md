# HANDOFF — resume context on a new machine

If you're Claude reading this in a fresh session: this file is the memory that
didn't travel with the machine. Read it, then continue. If you're Bar: in the
first session on the new computer, just say **"read HANDOFF.md"**.

Written 2026-07-28.

## The projects

| Repo | Local dir | Branch to work on | Notes |
|---|---|---|---|
| `bar-ge/celox-ai-2` | `my-fleet-app` | **`dev`** | The main Celox AI fleet SaaS (React + Vite + Supabase + Vercel) |
| `bar-ge/my-fleet-mobile` | `my-fleet-mobile` | `master` | Expo/React-Native mobile app |
| `bar-ge/mda-young` | `mda-young` | `master` | Separate project |

Rule of thumb: **commit + push both web and mobile after every change**; deploy
is automatic via Vercel on push to `main`. Work on `dev`, merge `dev`→`main` to
release.

## Where we stopped — 3 open threads

1. ✅ **dev.celoxai.com is fixed.** Its Vercel *Preview* env was missing the
   Supabase vars, so `/app` rendered a white screen. `VITE_SUPABASE_URL` +
   `VITE_SUPABASE_ANON_KEY` are now enabled for Preview and a rebuild baked them
   in (verified: the config is in the dev bundle). To view dev you still need a
   Vercel share link (Deployment Protection is on) — ask Claude to mint one, or
   log into Vercel in the same browser.
2. ⏳ **18 new vehicle/driver tabs are LIVE in production but never browser-tested.**
   Local login is blocked by Turnstile, and dev only just started working, so all
   of this shipped verified only by clean builds + live-schema checks, never by a
   human clicking through. **First thing to do: open dev, sign in, and click one
   tab of each kind** (a single-form tab like Leasing, a list tab like Fuel, a
   custom field). If something breaks it'll be a repeating pattern — fix once,
   applies everywhere.
3. ⏳ **Design system from Celox — not started.** Bar wants a Claude Design
   design-system project (claude.ai/design) extracted from the *existing* Celox
   look (full scope, not just the core). Auth to Claude Design already works
   (`DesignSync list_projects` returned an empty list = ready, no project yet).
   Source of the design language: the live app's tokens — plum `#2E2830`, cream
   `#F4F3EF`, blue `#2563EB`, ink `#2B2630`, border `#E5E1D8`, font Heebo, pill
   badges (`borderRadius: 999`), rounded cards with soft shadow, the inline-SVG
   icon set in `fleet-manager.jsx`.

## What the recent work added (all live in prod, additive only)

Netzer gap-analysis pass — extracted from screenshots at
`OneDrive - Amir-Agricul/Desktop/בר/celoxai/נצר/`. New vehicle-card tabs: full
details, leasing, insurance (with "who may drive" restrictions), annual tests,
tax/benefit (שווי שימוש) + diesel excise refund (בלו), equipment, fuel ledger,
transfers, events, accumulators, custom fields. Driver-card: full details,
complaints, family, custom fields. Maintenance plans now support **engine-hours**
intervals (forklifts). Password reveal toggle on all auth fields. All new DB
tables have tenant-scoped RLS (verified). `get_expiry_alerts()` gained
insurance / test / lease-end / registration / tachograph branches.

## Gotchas that cost time — don't relearn them

- **Local login is blocked by Turnstile** (prod sitekey rejects localhost). The
  gitignored `.env.local` sets the Cloudflare always-pass TEST key
  `1x00000000000000000000AA` to work around it. If login breaks locally, check
  that file exists.
- **Supabase anon key is public by design.** RLS is the real security boundary —
  all tenant tables have policies. Don't treat the anon key as a secret.
- **Vercel bakes `VITE_*` at build time.** Changing an env var needs a *rebuild*,
  and the var must be enabled for the right environment (Production vs Preview).
- **Redeploy targets matter:** the "Redeploy" button on a *production* deployment
  rebuilds prod, not the dev preview. To rebuild dev, push a commit to `dev`.
- **fleet-manager.jsx is ~9k lines, one file.** Bundles are code-split — to grep
  the deployed chunk find `fleet-manager-*.js` via the `App-*.js` chunk, not
  `index-*.js`.
- Supabase project id: `dvjjxwcvxjgqpdcnnmvv`. Never query prod `auth.users` PII.

## Backup layout (from the move)

- All code → GitHub (nothing local-only that matters).
- `.env` files → Google Drive `celox-env-backup/` (renamed per project) AND in the
  ZIP. Restore to original names per the table in `celox-move-backup/READ-ME-FIRST.md`.
- **keystores + `credentials.json`** → in the ZIP on Drive. `keystore.jks` is the
  Android signing key — losing it means no more Play Store updates. There are TWO
  different keystores (different SHA-256); keep both.
