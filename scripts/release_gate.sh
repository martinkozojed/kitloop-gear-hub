#!/bin/bash

set -euo pipefail

echo "🚀 Starting Release Gate Check..."
echo "================================="

# 1. Environment Check
SKIP_ENV_CHECK="${SKIP_ENV_CHECK:-false}"
if [ "$SKIP_ENV_CHECK" = "true" ]; then
  echo "⏭️  Skipping environment check (SKIP_ENV_CHECK=true)"
else
  ./scripts/check_env.sh
fi

echo ""
echo "📦 Installing/Verifying dependencies..."
if [ -n "${CI:-}" ]; then
  npm ci
else
  npm install
fi

echo ""
echo "🧹 Running Linter..."
if [ "${LINT_WARN_ONLY:-false}" = "true" ]; then
  npm run lint || echo "⚠️  Linting failed but ignored (LINT_WARN_ONLY=true)"
else
  npm run lint
fi

echo ""
echo "typescript Running Typecheck..."
npm run typecheck

echo ""
echo "🏗️  Running Build..."
npm run build

echo ""
echo "================================="
echo "✅ RELEASE GATE PASSED"
echo "================================="
