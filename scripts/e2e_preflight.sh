#!/usr/bin/env bash
set -euo pipefail

# Helper to call seed_preflight via e2e_harness.
# Requires: E2E_SUPABASE_URL, E2E_SEED_TOKEN, provider email (arg or E2E_PROVIDER_EMAIL).

usage() {
  cat <<'HELP' >&2
Usage: E2E_SUPABASE_URL=... E2E_SEED_TOKEN=... ./scripts/e2e_preflight.sh [options] provider@example.com

Options:
  --run-id <id>           Override run_id (default: preflight_<ts>)
  --base <key>            Optional external_key_base override
  -n, --dry-run           Print request (without secrets) and exit
  --raw                   Skip jq pretty-print (emit raw response)
  -h, --help              Show this help
HELP
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ -z "${E2E_SUPABASE_URL:-}" || -z "${E2E_SEED_TOKEN:-}" ]]; then
  echo "E2E_SUPABASE_URL and E2E_SEED_TOKEN must be set" >&2
  exit 1
fi

RUN_ID="preflight_$(date +%s)"
EXTERNAL_BASE=""
DRY_RUN=0
RAW=0
PROVIDER_EMAIL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --run-id)
      RUN_ID="${2:-}"
      shift 2
      ;;
    --base)
      EXTERNAL_BASE="${2:-}"
      shift 2
      ;;
    -n|--dry-run)
      DRY_RUN=1
      shift
      ;;
    --raw)
      RAW=1
      shift
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
    *)
      if [[ -z "$PROVIDER_EMAIL" ]]; then
        PROVIDER_EMAIL="$1"
      else
        RUN_ID="$1"
      fi
      shift
      ;;
  esac
done

PROVIDER_EMAIL="${PROVIDER_EMAIL:-${E2E_PROVIDER_EMAIL:-}}"
if [[ -z "$PROVIDER_EMAIL" ]]; then
  usage
  exit 1
fi

BODY=$(cat <<JSON
{
  "action": "seed_preflight",
  "run_id": "$RUN_ID",
  "provider_email": "$PROVIDER_EMAIL",
  "provider_status": "approved",
  "password": "${E2E_PROVIDER_PASSWORD:-}",
  "external_key_base": "${EXTERNAL_BASE}"
}
JSON
)

URL="${E2E_SUPABASE_URL%/}/functions/v1/e2e_harness"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "DRY RUN: would POST to $URL"
  echo "Headers: x-e2e-token: <redacted>, Content-Type: application/json"
  echo "Body:"
  echo "$BODY"
  exit 0
fi

echo "Calling seed_preflight for $PROVIDER_EMAIL (run_id=$RUN_ID)..."
RESPONSE=$(curl -sS -X POST "$URL" \
  -H "x-e2e-token: $E2E_SEED_TOKEN" \
  -H "Content-Type: application/json" \
  --data "$BODY")

if [[ "$RAW" -eq 1 ]]; then
  echo "$RESPONSE"
else
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
fi
