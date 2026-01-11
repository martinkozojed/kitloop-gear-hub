#!/usr/bin/env bash
set -euo pipefail

# Lint only changed files (vs. base branch)
# Usage: ./scripts/lint_changed.sh [base_ref]
# Example: ./scripts/lint_changed.sh origin/main
#
# Exit codes:
#   0 - No files to lint OR all files pass
#   1 - Linting failed (new issues in changed files)
#   2 - Script error (git, eslint not found, etc.)

BASE_REF="${1:-origin/main}"

echo "🔍 Linting changed files vs. ${BASE_REF}"
echo ""

# Check if base ref exists
if ! git rev-parse --verify "${BASE_REF}" >/dev/null 2>&1; then
  echo "❌ Error: Base ref '${BASE_REF}' not found"
  echo "   Available refs: $(git branch -r | head -5)"
  exit 2
fi

# Get changed files (modified, added, renamed)
# Use --diff-filter=d to exclude deleted files
CHANGED_FILES=$(git diff --name-only --diff-filter=d "${BASE_REF}...HEAD" | grep -E '\.(ts|tsx|js|jsx)$' | grep -E '^(src/|supabase/)' || true)

if [ -z "$CHANGED_FILES" ]; then
  echo "✅ No lintable files changed (src/**/*.{ts,tsx,js,jsx} or supabase/**/*.{ts,tsx,js,jsx})"
  echo "   Skipping lint check."
  exit 0
fi

# Count files
FILE_COUNT=$(echo "$CHANGED_FILES" | wc -l | xargs)
echo "📝 Found ${FILE_COUNT} changed file(s) to lint:"
echo "$CHANGED_FILES" | sed 's/^/   - /'
echo ""

# Convert newlines to spaces for eslint args
FILES_TO_LINT=$(echo "$CHANGED_FILES" | tr '\n' ' ')

# Run eslint on changed files
echo "🔧 Running ESLint on changed files..."
echo ""

# Use npx to ensure we use the project's eslint
if npx eslint $FILES_TO_LINT; then
  echo ""
  echo "✅ All changed files passed linting!"
  exit 0
else
  EXIT_CODE=$?
  echo ""
  echo "❌ Linting failed on changed files (exit code: ${EXIT_CODE})"
  echo ""
  echo "💡 Fix the issues above in your changed files, or:"
  echo "   - Run 'npm run lint' locally to see all issues"
  echo "   - Run 'npx eslint <file>' to lint specific files"
  exit 1
fi
