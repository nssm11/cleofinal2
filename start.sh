#!/usr/bin/env bash
# Cléopâtre — one-click local development (Unix/macOS)
# Mirrors start.ps1: handles .env, PGlite fallback, deps, DB and dev server.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "╔════════════════════════════════════════════════════╗"
echo "║  Cléopâtre — Espace Santé Beauté                 ║"
echo "║  Local development bootstrap (Unix)              ║"
echo "╚════════════════════════════════════════════════════╝"
echo

# 1. Prerequisites
echo "→ Checking prerequisites"
if ! command -v node >/dev/null 2>&1; then
  echo "  ✖ Node.js not found. Install Node 20+ from https://nodejs.org"
  exit 1
fi
echo "  ✓ Node $(node --version)"
if ! command -v npm >/dev/null 2>&1; then
  echo "  ✖ npm not found"
  exit 1
fi
echo "  ✓ npm $(npm --version)"

# 2. .env
echo "→ Environment (.env)"
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "  ✓ Created .env from .env.example"
  else
    echo "  ✖ .env and .env.example both missing"
    exit 1
  fi
fi

# Generate SESSION_SECRET if placeholder
if grep -q "SESSION_SECRET=change-me" .env || grep -q "SESSION_SECRET=cleopatre-dev" .env; then
  SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  # macOS sed needs backup
  if sed --version >/dev/null 2>&1; then
    sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$SECRET/" .env
  else
    sed -i '' "s/SESSION_SECRET=.*/SESSION_SECRET=$SECRET/" .env
  fi
  echo "  ✓ Generated SESSION_SECRET"
else
  echo "  ✓ .env already has a SESSION_SECRET"
fi

# Load .env for checks
set -a
# shellcheck disable=SC1091
source .env 2>/dev/null || true
set +a

# 3. PostgreSQL detection — PGlite fallback
echo "→ Database"
DATABASE_URL=${DATABASE_URL:-}
USE_PGLITE=${USE_PGLITE:-}

test_pg() {
  local url=$1
  if [[ -z "$url" ]] || [[ "$url" == pglite:* ]] || [[ "$url" == file:* ]]; then return 1; fi
  # Extract host/port via node
  node -e "
    try {
      const u = new URL(process.env.TEST_URL);
      const host = u.hostname || '127.0.0.1';
      const port = parseInt(u.port || '5432',10);
      const net = require('net');
      const s = net.createConnection({host, port}, () => { s.end(); process.exit(0); });
      s.on('error', () => process.exit(1));
      setTimeout(()=>process.exit(1), 1200);
    } catch { process.exit(1); }
  " 2>/dev/null
  TEST_URL="$url" node -e "
    const u = new URL(process.env.TEST_URL);
    const host = u.hostname || '127.0.0.1';
    const port = parseInt(u.port || '5432',10);
    const net = require('net');
    const s = net.createConnection({host, port}, () => { s.end(); process.exit(0); });
    s.on('error', () => process.exit(1));
    setTimeout(()=>process.exit(1), 1200);
  " && return 0 || return 1
}

if [ "$USE_PGLITE" = "1" ]; then
  echo "  ✓ Using PGlite (file-based Postgres at .pglite/data) — USE_PGLITE=1"
elif test_pg "$DATABASE_URL"; then
  echo "  ✓ PostgreSQL reachable at $DATABASE_URL"
else
  echo "  ⚠ PostgreSQL not reachable at $DATABASE_URL"
  echo "    Falling back to PGlite (file-based, no install needed)."
  if ! grep -q "USE_PGLITE=1" .env; then
    echo "" >> .env
    echo "USE_PGLITE=1" >> .env
    echo "PGLITE_DIR=.pglite/data" >> .env
    export USE_PGLITE=1
    export PGLITE_DIR=.pglite/data
    echo "  ✓ Wrote USE_PGLITE=1 to .env"
  fi
fi

# 4. Dependencies
echo "→ Dependencies"
if [ ! -d node_modules ]; then
  echo "  Installing npm dependencies…"
  npm install
  echo "  ✓ Dependencies installed"
else
  echo "  ✓ node_modules present — skipping install"
fi

# 5. DB setup
echo "→ Database setup"
echo "  → npm run db:push"
npm run db:push
echo "  ✓ Schema ready"
echo "  → npm run db:seed"
npm run db:seed
echo "  ✓ Demo data seeded"
echo "    Demo accounts: admin@cleopatre.tn / Admin123!  ·  client@cleopatre.tn / Client123!"

# 6. Dev server
PORT=${PORT:-3000}
echo "→ Starting dev server on http://localhost:$PORT"
echo ""
echo "  Cléopâtre is starting…"
echo "  → Local:   http://localhost:$PORT"
echo "  → Admin:   http://localhost:$PORT/admin  (admin@cleopatre.tn / Admin123!)"
echo "  Press Ctrl+C to stop."
echo ""
PORT=$PORT npm run dev
