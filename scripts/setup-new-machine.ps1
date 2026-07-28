<#
  setup-new-machine.ps1 — get a new Windows machine ready to continue Celox work.

  What it does automatically:
    1. clones the three repos (skips any that already exist)
    2. checks out `dev` in my-fleet-app
    3. restores .env / keystore / credentials from your extracted backup folder
    4. runs `npm install` in each, and `npm run build` in my-fleet-app to verify

  What it CANNOT do (you must do these yourself first):
    - install Git, Node.js LTS, and Claude Code
    - log into GitHub / Vercel / Supabase / Claude

  Usage (from the folder where you want the repos, e.g. Desktop):
    powershell -ExecutionPolicy Bypass -File setup-new-machine.ps1 -BackupDir "C:\path\to\celox-move-backup"

  -BackupDir is the folder you extracted from the Drive ZIP (the one containing
  READ-ME-FIRST.md and the my-fleet-app / my-fleet-mobile / mda-young subfolders).
  Omit it to clone + install only, and copy the secrets by hand later.
#>

param(
  [string]$BackupDir = ""
)

$ErrorActionPreference = "Stop"
function Say($m, $c = "Cyan") { Write-Host "`n=== $m ===" -ForegroundColor $c }
function Ok($m)  { Write-Host "  [ok] $m"   -ForegroundColor Green }
function Warn($m){ Write-Host "  [!!] $m"   -ForegroundColor Yellow }

# --- 0. sanity: required tools present? ---
Say "Checking prerequisites"
foreach ($t in @("git", "node", "npm")) {
  if (Get-Command $t -ErrorAction SilentlyContinue) { Ok "$t found" }
  else { throw "$t is not installed. Install Git + Node.js LTS first, then re-run." }
}

# --- 1. clone the three repos ---
$repos = @(
  @{ url = "https://github.com/bar-ge/celox-ai-2.git";      dir = "my-fleet-app"    },
  @{ url = "https://github.com/bar-ge/my-fleet-mobile.git"; dir = "my-fleet-mobile" },
  @{ url = "https://github.com/bar-ge/mda-young.git";       dir = "mda-young"       }
)
Say "Cloning repos"
foreach ($r in $repos) {
  if (Test-Path $r.dir) { Warn "$($r.dir) already exists — skipping clone" }
  else { git clone $r.url $r.dir; Ok "cloned $($r.dir)" }
}

# work on dev in the web app
if (Test-Path "my-fleet-app") {
  Push-Location "my-fleet-app"; git checkout dev 2>$null; Ok "my-fleet-app on 'dev'"; Pop-Location
}

# --- 2. restore secrets from the backup folder ---
if ($BackupDir -ne "" -and (Test-Path $BackupDir)) {
  Say "Restoring secrets from $BackupDir"
  $map = @(
    @{ from = "my-fleet-app\.env";              to = "my-fleet-app\.env" },
    @{ from = "my-fleet-app\.env.local";        to = "my-fleet-app\.env.local" },
    @{ from = "my-fleet-mobile\.env";           to = "my-fleet-mobile\.env" },
    @{ from = "my-fleet-mobile\credentials.json";to = "my-fleet-mobile\credentials.json" },
    @{ from = "my-fleet-mobile\keystore.jks";   to = "my-fleet-mobile\keystore.jks" },
    @{ from = "mda-young\.env.local";           to = "mda-young\.env.local" }
  )
  foreach ($m in $map) {
    $src = Join-Path $BackupDir $m.from
    if (Test-Path $src) { Copy-Item $src $m.to -Force; Ok "restored $($m.to)" }
    else { Warn "not in backup: $($m.from)" }
  }
} else {
  Warn "No -BackupDir given (or path missing). Skipped secret restore — copy .env + keystore by hand."
}

# --- 3. install deps + verify the web build ---
Say "Installing dependencies (this takes a few minutes)"
foreach ($r in $repos) {
  if (Test-Path (Join-Path $r.dir "package.json")) {
    Push-Location $r.dir; npm install; Ok "npm install done in $($r.dir)"; Pop-Location
  }
}

Say "Verifying my-fleet-app build"
Push-Location "my-fleet-app"
npm run build
if ($LASTEXITCODE -eq 0) { Ok "build passed — web app is ready" } else { Warn "build failed — check the output above" }
Pop-Location

Say "Done" "Green"
Write-Host @"
  Next steps you do by hand:
   - log into GitHub / Vercel / Supabase / Claude Code
   - open Claude Code in my-fleet-app and say: read HANDOFF.md
   - open dev.celoxai.com (ask Claude for a Vercel share link) and click through
     the new vehicle/driver tabs to smoke-test them
"@ -ForegroundColor Cyan
