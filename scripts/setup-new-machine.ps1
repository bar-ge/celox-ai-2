# setup-new-machine.ps1 - prepare a new Windows machine to continue Celox work.
#
# Automates: clone 3 repos, checkout dev, restore .env/keystore from backup,
# npm install, and verify the web build.
#
# You must first install Git + Node.js LTS + Claude Code and log into your
# accounts. This script cannot do those.
#
# Usage (run from the folder where you want the repos, e.g. your Desktop -
# NOT an admin PowerShell, which starts in C:\Windows\system32):
#
#   powershell -ExecutionPolicy Bypass -File .\my-fleet-app\scripts\setup-new-machine.ps1 -BackupDir "C:\path\to\celox-move-backup"
#
# -BackupDir is the folder you extracted from the Drive ZIP (contains
# READ-ME-FIRST.md and the per-project subfolders). Omit it to clone+install
# only and copy the secrets by hand later.

param(
  [string]$BackupDir = ""
)

$ErrorActionPreference = "Stop"

function Say($m)  { Write-Host ""; Write-Host "=== $m ===" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "  [ok] $m" -ForegroundColor Green }
function Warn($m) { Write-Host "  [!!] $m" -ForegroundColor Yellow }

# Guard against running inside C:\Windows\system32 (admin PowerShell default).
if ((Get-Location).Path -like "*\system32") {
  throw "You are in C:\Windows\system32 (admin PowerShell). cd to your Desktop first, then re-run."
}

# 0. prerequisites
Say "Checking prerequisites"
foreach ($t in @("git", "node", "npm")) {
  if (Get-Command $t -ErrorAction SilentlyContinue) {
    Ok "$t found"
  } else {
    throw "$t is not installed. Install Git + Node.js LTS first, then reopen PowerShell and re-run."
  }
}

# 1. clone
$repos = @(
  @{ url = "https://github.com/bar-ge/celox-ai-2.git";      dir = "my-fleet-app"    },
  @{ url = "https://github.com/bar-ge/my-fleet-mobile.git"; dir = "my-fleet-mobile" },
  @{ url = "https://github.com/bar-ge/mda-young.git";       dir = "mda-young"       }
)
Say "Cloning repos"
foreach ($r in $repos) {
  if (Test-Path $r.dir) {
    Warn "$($r.dir) already exists, skipping clone"
  } else {
    git clone $r.url $r.dir
    Ok "cloned $($r.dir)"
  }
}

# checkout dev in the web app
if (Test-Path "my-fleet-app") {
  Push-Location "my-fleet-app"
  git checkout dev 2>$null
  Ok "my-fleet-app on 'dev'"
  Pop-Location
}

# 2. restore secrets
if ($BackupDir -ne "" -and (Test-Path $BackupDir)) {
  Say "Restoring secrets from $BackupDir"
  $map = @(
    @{ from = "my-fleet-app\.env";               to = "my-fleet-app\.env" },
    @{ from = "my-fleet-app\.env.local";         to = "my-fleet-app\.env.local" },
    @{ from = "my-fleet-mobile\.env";            to = "my-fleet-mobile\.env" },
    @{ from = "my-fleet-mobile\credentials.json";to = "my-fleet-mobile\credentials.json" },
    @{ from = "my-fleet-mobile\keystore.jks";    to = "my-fleet-mobile\keystore.jks" },
    @{ from = "mda-young\.env.local";            to = "mda-young\.env.local" }
  )
  foreach ($m in $map) {
    $src = Join-Path $BackupDir $m.from
    if (Test-Path $src) {
      Copy-Item $src $m.to -Force
      Ok "restored $($m.to)"
    } else {
      Warn "not in backup: $($m.from)"
    }
  }
} else {
  Warn "No -BackupDir given (or path missing). Skipped secret restore; copy .env + keystore by hand."
}

# 3. install + verify
Say "Installing dependencies (a few minutes)"
foreach ($r in $repos) {
  if (Test-Path (Join-Path $r.dir "package.json")) {
    Push-Location $r.dir
    npm install
    Ok "npm install done in $($r.dir)"
    Pop-Location
  }
}

Say "Verifying my-fleet-app build"
Push-Location "my-fleet-app"
npm run build
if ($LASTEXITCODE -eq 0) { Ok "build passed, web app is ready" } else { Warn "build failed, check output above" }
Pop-Location

Say "Done"
Write-Host "  Next: log into GitHub / Vercel / Supabase / Claude, open Claude Code in" -ForegroundColor Cyan
Write-Host "  my-fleet-app and say: read HANDOFF.md" -ForegroundColor Cyan
