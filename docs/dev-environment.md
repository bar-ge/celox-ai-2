# Dev Environment Setup

Two completely separate environments:

| | Production | Development |
|-|-----------|-------------|
| **Git branch** | `main` | `dev` |
| **Supabase project** | celoxai (prod) | celoxai-dev |
| **Vercel deployment** | celoxai.com | preview URL (auto) |
| **Turnstile** | Real (paid) | Test key (always passes) |
| **Data** | Real customers | Safe test data only |

---

## One-Time Setup (do this once)

### Step 1 — Create the DEV Supabase project

1. Go to [app.supabase.com](https://app.supabase.com) → **New project**
2. Name: `celoxai-dev`
3. Set a database password (save it somewhere safe)
4. Click **Create new project** — wait ~1 minute
5. Go to **Settings → API** and copy:
   - Project URL: `https://XXXX.supabase.co`
   - `anon` key (public)
   - `service_role` key (secret — keep safe)

### Step 2 — Run the setup script

```bash
bash scripts/setup-dev-env.sh \
  https://XXXX.supabase.co \
  YOUR_DEV_ANON_KEY \
  YOUR_DEV_SERVICE_ROLE_KEY
```

This will:
- Create `.env.dev` (gitignored — stays on your machine only)
- Install Supabase CLI if needed
- Push all database migrations to the dev project
- Show you the Vercel env vars to set

### Step 3 — Set Vercel environment variables for the `dev` branch

1. Go to [vercel.com](https://vercel.com) → Celox AI project → **Settings → Environment Variables**
2. Add each variable below, but set **Environment** to **Preview** and **Git branch** to `dev`:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | Your DEV project URL |
| `VITE_SUPABASE_ANON_KEY` | Your DEV anon key |
| `VITE_TURNSTILE_SITE_KEY` | `1x00000000000000000000AA` (test key — always passes) |
| `VITE_MASTER_EMAIL` | bar.gershenzon@gmail.com |

> Do NOT add the service role key to Vercel — it's only used in setup scripts.

### Step 4 — Enable branch deployments in Vercel

1. Vercel project → **Settings → Git**
2. Under **Preview Deployments**, make sure it's set to deploy all branches
3. Now every push to `dev` gets its own preview URL automatically

---

## Daily Workflow

### Working on a new feature

```bash
# Start on dev branch
git checkout dev

# Run app against DEV Supabase (safe — not real customer data)
npm run dev:dev

# Make changes, test thoroughly
# When ready to deploy to production:
git checkout main
git merge dev
git push origin main
# → Vercel auto-deploys to celoxai.com
```

### Testing a specific feature in isolation

```bash
# Create a feature branch from dev
git checkout dev
git checkout -b feature/my-new-feature

# Work and test
npm run dev:dev

# Merge back to dev when done
git checkout dev
git merge feature/my-new-feature

# Push dev → Vercel gives you a preview URL to share/test
git push origin dev
```

### Pushing schema changes (new tables, columns)

```bash
# 1. Create the migration file
# File name format: supabase/migrations/YYYYMMDD_description.sql

# 2. Apply to DEV first and test
supabase link --project-ref YOUR_DEV_PROJECT_REF
supabase db push

# 3. Test the feature thoroughly against DEV

# 4. Apply to PRODUCTION only after testing passes
supabase link --project-ref dvjjxwcvxjgqpdcnnmvv
supabase db push
```

---

## What's Different in DEV

| Feature | Production | Dev |
|---------|-----------|-----|
| Turnstile CAPTCHA | Real (requires browser) | Test key — always passes |
| Email sending | Real emails sent | Can use test email addresses |
| Data | Real customer data — never touch | Safe to create/delete/modify anything |
| OAuth | Real Google/Microsoft | Same OAuth apps (redirects may need localhost added) |
| Supabase backups | Daily automatic | Manual only (free plan) |

---

## Important Rules

- ✅ All new features are coded and tested on `dev` first
- ✅ Only merge to `main` after testing passes on dev
- ✅ Never run destructive operations (DELETE, DROP) on the production Supabase project
- ✅ Never use real customer data in dev/test
- ❌ Never commit `.env.dev` or `.env` to Git
- ❌ Never push directly to `main` for new features — always go through `dev`
