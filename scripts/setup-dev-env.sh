#!/usr/bin/env bash
# setup-dev-env.sh
# Run this ONCE after creating your celoxai-dev Supabase project.
# Usage: bash scripts/setup-dev-env.sh <SUPABASE_DEV_URL> <SUPABASE_DEV_ANON_KEY> <SUPABASE_DEV_SERVICE_ROLE_KEY>
# Example: bash scripts/setup-dev-env.sh https://xxxx.supabase.co sb_publishable_xxx service_role_xxx

set -e

DEV_URL="$1"
DEV_ANON_KEY="$2"
DEV_SERVICE_ROLE_KEY="$3"

if [ -z "$DEV_URL" ] || [ -z "$DEV_ANON_KEY" ] || [ -z "$DEV_SERVICE_ROLE_KEY" ]; then
  echo "Usage: bash scripts/setup-dev-env.sh <DEV_URL> <DEV_ANON_KEY> <DEV_SERVICE_ROLE_KEY>"
  echo ""
  echo "Find these values at: app.supabase.com → celoxai-dev → Settings → API"
  exit 1
fi

echo "🔧 Setting up Celox AI DEV environment..."
echo "DEV URL: $DEV_URL"
echo ""

# 1. Create .env.dev
echo "📝 Creating .env.dev..."
cat > .env.dev <<EOF
VITE_MASTER_EMAIL=bar.gershenzon@gmail.com
VITE_SUPABASE_URL=$DEV_URL
VITE_SUPABASE_ANON_KEY=$DEV_ANON_KEY
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
VITE_VAPID_PUBLIC_KEY=
EOF
echo "   ✅ .env.dev created"

# 2. Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo ""
  echo "📦 Installing Supabase CLI..."
  npm install -g supabase
fi

echo ""
echo "🗄️  Pushing database schema to DEV project..."

# Extract project ref from URL (e.g. https://xxxx.supabase.co → xxxx)
DEV_PROJECT_REF=$(echo "$DEV_URL" | sed 's|https://||' | sed 's|\.supabase\.co||')
echo "   Project ref: $DEV_PROJECT_REF"

# Link to dev project
supabase link --project-ref "$DEV_PROJECT_REF"

# Push all migrations to the dev database
supabase db push

echo ""
echo "✅ DEV environment setup complete!"
echo ""
echo "To run the app against DEV:"
echo "  npm run dev:dev"
echo ""
echo "Next step: Go to Vercel dashboard and set these env vars for the 'dev' branch:"
echo "  VITE_SUPABASE_URL       = $DEV_URL"
echo "  VITE_SUPABASE_ANON_KEY  = $DEV_ANON_KEY"
echo "  (See docs/dev-environment.md for full Vercel setup instructions)"
