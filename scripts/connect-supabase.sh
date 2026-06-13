#!/usr/bin/env bash
# Connect this repo to a hosted Supabase project and apply migrations.
#
# Prereqs: a Supabase project created in SYDNEY (ap-southeast-2) — required by
# the AU data-residency rule (§10.1). Region is fixed at project creation.
#
# Usage:
#   SUPABASE_PROJECT_REF=abcdefghijklmnop SUPABASE_DB_PASSWORD='...' ./scripts/connect-supabase.sh
#
# Notes:
#  - Find the project ref in the Supabase dashboard URL or Settings → General.
#  - If the DB password contains URL-special characters (@ : / ? # & %), they
#    must be percent-encoded in connection strings; this script does it for you.
set -euo pipefail

: "${SUPABASE_PROJECT_REF:?Set SUPABASE_PROJECT_REF (Settings → General → Reference ID)}"
: "${SUPABASE_DB_PASSWORD:?Set SUPABASE_DB_PASSWORD (the database password chosen at project creation)}"

REGION="${SUPABASE_REGION:-ap-southeast-2}"
if [[ "$REGION" != "ap-southeast-2" ]]; then
  echo "WARNING: region '$REGION' is not Sydney. Patient data must stay in AU (§10.1)." >&2
fi

ENC_PASSWORD=$(node -e 'process.stdout.write(encodeURIComponent(process.env.SUPABASE_DB_PASSWORD))')
POOLER_HOST="aws-0-${REGION}.pooler.supabase.com"
USER="postgres.${SUPABASE_PROJECT_REF}"

DATABASE_URL="postgresql://${USER}:${ENC_PASSWORD}@${POOLER_HOST}:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://${USER}:${ENC_PASSWORD}@${POOLER_HOST}:5432/postgres"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"

touch "$ENV_FILE"
# Replace or append the two URLs, leaving the rest of .env untouched.
grep -vE '^(DATABASE_URL|DIRECT_URL)=' "$ENV_FILE" > "$ENV_FILE.tmp" || true
{
  cat "$ENV_FILE.tmp"
  echo "DATABASE_URL=\"$DATABASE_URL\""
  echo "DIRECT_URL=\"$DIRECT_URL\""
} > "$ENV_FILE"
rm -f "$ENV_FILE.tmp"
echo "Wrote DATABASE_URL and DIRECT_URL to .env"

echo "Applying migrations to Supabase..."
cd "$ROOT/packages/db"
DATABASE_URL="$DATABASE_URL" DIRECT_URL="$DIRECT_URL" npx prisma migrate deploy

echo
echo "Done. Verify in the Supabase Table Editor — you should see 22 tables."
