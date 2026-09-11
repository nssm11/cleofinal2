#Requires -Version 5.1
<#
.SYNOPSIS
  Cléopâtre — one-click local development startup (Windows-friendly).

.DESCRIPTION
  Bootstraps the entire Cléopâtre stack on a developer machine:

  1. Checks prerequisites (Node.js, npm)
  2. Ensures .env exists (creates from .env.example, generates SESSION_SECRET)
  3. Detects PostgreSQL availability — falls back to file-based PGlite (.pglite/data)
     when no system Postgres is reachable, so `npm run dev` works everywhere
  4. Installs dependencies (npm install) if needed
  5. Pushes the Drizzle schema and seeds demo data
  6. Starts the Next.js dev server

  Usage: .\start.ps1  (or right-click → Run with PowerShell)

  Flags:
    -SkipInstall    Skip npm install even if node_modules is missing
    -SkipSeed       Skip seeding (useful when you already have data)
    -NoOpen         Do not try to open a browser
    -Port 3000      Port for the dev server (default 3000)
#>
[CmdletBinding()]
param(
  [switch]$SkipInstall,
  [switch]$SkipSeed,
  [switch]$NoOpen,
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step($msg) { Write-Host "`n→ $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  ⚠ $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "  ✖ $msg" -ForegroundColor Red }

# ── Resolve repo root (where this script lives) ───────────────────────
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host @"
╔════════════════════════════════════════════════════╗
║  Cléopâtre — Espace Santé Beauté                 ║
║  Local development bootstrap                     ║
╚════════════════════════════════════════════════════╝
"@ -ForegroundColor White

# ── 1. Prerequisites ────────────────────────────────────────────────
Write-Step "Checking prerequisites"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Err "Node.js not found. Install Node 20+ from https://nodejs.org"
  exit 1
}
$nodeVer = (& node --version).Trim()
Write-Ok "Node $nodeVer"

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Err "npm not found (comes with Node.js). Reinstall Node."
  exit 1
}
$npmVer = (& npm --version).Trim()
Write-Ok "npm $npmVer"

# ── 2. Environment file ────────────────────────────────────────────
Write-Step "Environment (.env)"

if (-not (Test-Path ".env")) {
  if (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env"
    Write-Ok "Created .env from .env.example"
  } else {
    Write-Err ".env and .env.example both missing — cannot continue"
    exit 1
  }
}

# Ensure SESSION_SECRET is not the placeholder
$envContent = Get-Content ".env" -Raw
if ($envContent -match "SESSION_SECRET=change-me" -or $envContent -match "SESSION_SECRET=cleopatre-dev") {
  # Generate 32 bytes hex via Node (works on Windows without openssl)
  $secret = (& node -e "console.log(require('crypto').randomBytes(32).toString('hex'))").Trim()
  $envContent = $envContent -replace "SESSION_SECRET=.*", "SESSION_SECRET=$secret"
  Set-Content -Path ".env" -Value $envContent -NoNewline
  Write-Ok "Generated SESSION_SECRET"
} else {
  Write-Ok ".env already has a SESSION_SECRET"
}

# Load .env into current session for the checks below (simple parser)
Get-Content ".env" | ForEach-Object {
  if ($_ -match "^\s*#") { return }
  if ($_ -match "^\s*$") { return }
  if ($_ -match "^\s*([^=]+)\s*=\s*(.*)\s*$") {
    $k = $Matches[1].Trim()
    $v = $Matches[2].Trim().Trim('"').Trim("'")
    if ($k -and -not (Test-Path env:$k)) {
      # Only set if not already set in the shell (shell wins)
      Set-Item -Path env:$k -Value $v
    }
  }
}

# ── 3. PostgreSQL detection — graceful PGlite fallback ─────────────
Write-Step "Database"

$databaseUrl = $env:DATABASE_URL
$usePglite = $env:USE_PGLITE

# If DATABASE_URL is the default localhost postgres, probe it; if unreachable,
# switch to PGlite automatically so the dev experience never blocks.
function Test-Postgres($url) {
  if (-not $url -or $url.StartsWith("pglite:") -or $url.StartsWith("file:")) { return $false }
  # Quick TCP probe to the host:port in DATABASE_URL (default 127.0.0.1:5432)
  try {
    $uri = [Uri]$url
    $host = $uri.Host
    if (-not $host) { $host = "127.0.0.1" }
    $port = $uri.Port
    if ($port -eq -1) { $port = 5432 }
    $tcp = New-Object System.Net.Sockets.TcpClient
    $res = $tcp.BeginConnect($host, $port, $null, $null)
    $wait = $res.AsyncWaitHandle.WaitOne(1200, $false)
    $tcp.Close()
    return $wait
  } catch {
    return $false
  }
}

$pgReachable = Test-Postgres $databaseUrl

if ($usePglite -eq "1") {
  Write-Ok "Using PGlite (file-based Postgres at .pglite/data) — USE_PGLITE=1"
  Write-Host "  No system PostgreSQL required for development." -ForegroundColor DarkGray
} elseif ($pgReachable) {
  Write-Ok "PostgreSQL reachable at $databaseUrl"
} else {
  Write-Warn "PostgreSQL not reachable at $databaseUrl"
  Write-Host "  Falling back to PGlite (file-based, no install needed)." -ForegroundColor DarkGray
  Write-Host "  Data will be stored in .pglite/data. To use a real Postgres," -ForegroundColor DarkGray
  Write-Host "  start your service and ensure DATABASE_URL is correct." -ForegroundColor DarkGray
  # Persist the fallback for subsequent runs
  if (-not $envContent.Contains("USE_PGLITE=1")) {
    Add-Content -Path ".env" -Value "`nUSE_PGLITE=1`nPGLITE_DIR=.pglite/data"
    $env:USE_PGLITE = "1"
    $env:PGLITE_DIR = ".pglite/data"
    Write-Ok "Wrote USE_PGLITE=1 to .env (remove it to force Postgres)"
  }
}

# ── 4. Dependencies ─────────────────────────────────────────────────
if (-not $SkipInstall) {
  Write-Step "Dependencies"
  if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing npm dependencies (first run)…" -ForegroundColor DarkGray
    & npm install
    if ($LASTEXITCODE -ne 0) { Write-Err "npm install failed"; exit $LASTEXITCODE }
    Write-Ok "Dependencies installed"
  } else {
    Write-Ok "node_modules present — skipping install (use -SkipInstall to force skip, or delete node_modules to reinstall)"
  }
} else {
  Write-Warn "Skipping npm install (-SkipInstall)"
}

# ── 5. Database schema & seed ───────────────────────────────────────
Write-Step "Database setup"

# Always push schema (idempotent)
Write-Host "  → npm run db:push" -ForegroundColor DarkGray
& npm run db:push
if ($LASTEXITCODE -ne 0) {
  Write-Err "db:push failed. Check DATABASE_URL and that the DB is reachable."
  Write-Host "  Tip: if you use Postgres, ensure the database exists: createdb app_db" -ForegroundColor DarkGray
  Write-Host "  Tip: for PGlite, delete .pglite to start fresh." -ForegroundColor DarkGray
  exit $LASTEXITCODE
}
Write-Ok "Schema ready"

if (-not $SkipSeed) {
  # Seed only if tables are empty or user wants fresh data
  Write-Host "  → npm run db:seed" -ForegroundColor DarkGray
  & npm run db:seed
  if ($LASTEXITCODE -ne 0) {
    Write-Err "db:seed failed"
    exit $LASTEXITCODE
  }
  Write-Ok "Demo data seeded"
  Write-Host "  Demo accounts: admin@cleopatre.tn / Admin123!  ·  client@cleopatre.tn / Client123!  ·  support@cleopatre.tn / Support123!" -ForegroundColor DarkGray
} else {
  Write-Warn "Skipping seed (-SkipSeed)"
}

# ── 6. Start dev server ─────────────────────────────────────────────
Write-Step "Starting dev server on http://localhost:$Port"

# Ensure port is not already in use
$portInUse = $false
try {
  $l = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
  $l.Start(); $l.Stop()
} catch { $portInUse = $true }
if ($portInUse) {
  Write-Warn "Port $Port already in use — trying to start anyway (Next.js will pick another if needed)"
}

# Set PORT for Next.js
$env:PORT = "$Port"

Write-Host @"

  Cléopâtre is starting…

  → Local:   http://localhost:$Port
  → Admin:   http://localhost:$Port/admin  (admin@cleopatre.tn / Admin123!)
  → Health:  http://localhost:$Port/api/health

  Press Ctrl+C to stop.

"@ -ForegroundColor White

if (-not $NoOpen) {
  # Fire-and-forget open browser after a short delay
  Start-Job -ScriptBlock {
    Start-Sleep -Seconds 3
    try { Start-Process "http://localhost:$using:Port" | Out-Null } catch {}
  } | Out-Null
}

& npm run dev

# If npm run dev exits, propagate its code
exit $LASTEXITCODE
