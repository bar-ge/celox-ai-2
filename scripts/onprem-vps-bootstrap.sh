#!/usr/bin/env bash
# One-shot setup for the WhatsApp agent / avatar chatbot's on-prem LLM box.
# Paste this whole file into your VPS provider's web console (or SSH) as
# root on a fresh Ubuntu 22.04+ box, then run: bash onprem-vps-bootstrap.sh
#
# What it does:
#   1. Installs Ollama (serves an OpenAI-compatible API on 127.0.0.1:11434,
#      not exposed to the internet directly)
#   2. Pulls two candidate models so you can compare Hebrew quality before
#      picking one — see scripts/_compare-onprem-models.mjs
#   3. Installs Caddy as a reverse proxy that terminates TLS and gates every
#      request behind a bearer token, so the box is safe to expose publicly
#   4. Opens the firewall for only 22/80/443
#   5. Prints the URL + token + model names to put into Vercel env vars
#
# Before running: point a DNS A record for the subdomain you want (e.g.
# llm.celoxai.com) at this VPS's public IP. Caddy needs that to issue a real
# TLS certificate automatically — edit LLM_DOMAIN below to match.
#
# Note: consider trying Hugging Face's free tier first (see
# docs/onprem-llm-setup.md, Tier 2) — no server needed at all. This script
# is for the more durable but more involved self-hosted route.
#
# Safe to re-run — every step here is idempotent.

set -euo pipefail

# ---- EDIT THIS LINE ------------------------------------------------------
LLM_DOMAIN="llm.celoxai.com"   # DNS A record must point here before running
# ---------------------------------------------------------------------------

echo "==> Updating apt and installing base packages"
apt-get update -y
apt-get install -y curl ufw openssl debian-keyring debian-archive-keyring apt-transport-https gnupg

echo "==> Installing Ollama"
if ! command -v ollama >/dev/null 2>&1; then
  curl -fsSL https://ollama.com/install.sh | sh
fi
systemctl enable --now ollama

echo "==> Pulling candidate models (this can take a while on first run)"
# NOTE: verify these tag names against https://ollama.com/library before
# running if either pull 404s — Ollama's library naming can lag or differ
# slightly from a model's marketing name, and this script was written before
# either tag could be confirmed live.
ollama pull gemma4:4b   || echo "!! gemma4:4b pull failed — check the exact tag at https://ollama.com/library/gemma4"
ollama pull qwen3:8b    || echo "!! qwen3:8b pull failed — check the exact tag at https://ollama.com/library/qwen3"

echo "==> Installing Caddy"
if ! command -v caddy >/dev/null 2>&1; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi

echo "==> Generating a bearer token for the proxy (reuse across redeploys — save it!)"
TOKEN_FILE="/etc/caddy/onprem-llm.token"
if [ ! -f "$TOKEN_FILE" ]; then
  openssl rand -hex 32 > "$TOKEN_FILE"
  chmod 600 "$TOKEN_FILE"
fi
TOKEN=$(cat "$TOKEN_FILE")

echo "==> Writing Caddyfile"
cat > /etc/caddy/Caddyfile <<EOF
${LLM_DOMAIN} {
	@authorized header Authorization "Bearer ${TOKEN}"
	reverse_proxy @authorized 127.0.0.1:11434
	respond 401
}
EOF

systemctl reload caddy 2>/dev/null || systemctl restart caddy
systemctl enable caddy

echo "==> Firewall: allow only SSH/HTTP/HTTPS"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo "======================================================================"
echo "Done. Set these in Vercel (Project Settings -> Environment Variables,"
echo "both Preview AND Production so dev.celoxai.com and celoxai.com both"
echo "pick it up):"
echo ""
echo "  ONPREM_LLM_URL      = https://${LLM_DOMAIN}/v1/chat/completions"
echo "  ONPREM_LLM_API_KEY  = ${TOKEN}"
echo "  ONPREM_LLM_MODEL    = gemma4:4b        (or qwen3:8b — pick after comparing)"
echo ""
echo "Test it directly from this box first:"
echo "  curl https://${LLM_DOMAIN}/v1/chat/completions \\"
echo "    -H \"Authorization: Bearer ${TOKEN}\" -H 'Content-Type: application/json' \\"
echo "    -d '{\"model\":\"gemma4:4b\",\"messages\":[{\"role\":\"user\",\"content\":\"שלום\"}]}'"
echo "======================================================================"
