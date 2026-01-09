#!/bin/bash

# Strict mode
set -euo pipefail

# Configuration
REQUIRED_VARS=("VITE_SUPABASE_URL" "VITE_SUPABASE_ANON_KEY")
OPTIONAL_VARS=("VITE_SUPABASE_PROJECT_ID" "VITE_SUPABASE_PUBLISHABLE_KEY")
ENV_FILE=".env"
ENV_LOCAL_FILE=".env.local"

echo "🔍 Checking environment variables..."

# Load .env variables (simulate Vite precedence) safely
# We use set +e here because grep returning no matches exits with 1
set +e
if [ -f "$ENV_FILE" ]; then
  echo "📄 Loading defaults from $ENV_FILE"
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

if [ -f "$ENV_LOCAL_FILE" ]; then
  echo "📄 Loading overrides from $ENV_LOCAL_FILE"
  export $(grep -v '^#' "$ENV_LOCAL_FILE" | xargs)
fi
set -e

MISSING_VARS=0

for VAR in "${REQUIRED_VARS[@]}"; do
  # Indirect variable reference in bash
  if [ -z "${!VAR:-}" ]; then
    echo "❌ Missing REQUIRED variable: $VAR"
    MISSING_VARS=1
  else
    echo "✅ Found $VAR"
  fi
done

# Optional warning checks (don't fail build)
for VAR in "${OPTIONAL_VARS[@]}"; do
  if [ -n "${!VAR:-}" ]; then
    echo "ℹ️  Found optional variable: $VAR"
  fi
done

if [ "$MISSING_VARS" -eq 1 ]; then
  echo ""
  echo "💥 Environment check FAILED."
  echo "   Please ensure .env.local or .env contains the required variables."
  echo "   See docs/release_gate.md for details."
  exit 1
fi

echo "✨ Environment check PASSED."
exit 0
