#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "SUPABASE_DB_URL must be set to a service connection string" >&2
  exit 1
fi

echo "Running security regression checks against database..."
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$(dirname "$0")/security_regression.sql"
echo "security_regression: PASS"
