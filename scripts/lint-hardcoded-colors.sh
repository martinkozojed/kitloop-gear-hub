#!/bin/bash
# lint-hardcoded-colors.sh
# FAIL if hardcoded colors (#hex or rgba()) are found in CHANGED TS/TSX files
# Allowed files: index.css, tailwind.config.ts, DESIGN_TOKENS.md, theme files

set -e

echo "🔍 Checking for hardcoded colors in CHANGED files (no new violations mode)..."

# Allowed patterns (files where hardcoded colors are OK)
ALLOWED_PATTERN="index\.css|tailwind\.config\.ts|DESIGN_TOKENS\.md|theme|src/lib/telemetry\.ts"

# Get changed files compared to main branch
CHANGED_FILES=$(git diff --name-only origin/main...HEAD -- '***.ts' '***.tsx' 2>/dev/null || true)

if [ -z "$CHANGED_FILES" ]; then
  echo "✅ No TS/TSX files changed."
  exit 0
fi

echo "Checking the following files:"
echo "$CHANGED_FILES"
echo "-----------------------------------------------------"

FOUND_VIOLATIONS=0
VIOLATIONS_OUTPUT=""

for file in $CHANGED_FILES; do
  # Skip allowed files
  if [[ "$file" =~ $ALLOWED_PATTERN ]]; then
    continue
  fi

  if [ ! -f "$file" ]; then
    continue
  fi
  
  # Search for violations in valid files
  MATCHES=$(grep -E "(#[0-9a-fA-F]{3,8}|rgba?\s*\()" "$file" || true)

  if [ -n "$MATCHES" ]; then
    FOUND_VIOLATIONS=1
    VIOLATIONS_OUTPUT="${VIOLATIONS_OUTPUT}\n\n📄 File: $file\n$MATCHES"
  fi
done

if [ "$FOUND_VIOLATIONS" -eq 1 ]; then
  echo ""
  echo "❌ FAIL: Found hardcoded colors in CHANGED files:"
  echo "─────────────────────────────────────────────────────"
  echo -e "$VIOLATIONS_OUTPUT"
  echo "─────────────────────────────────────────────────────"
  echo ""
  echo "💡 Fix: Replace with design tokens from index.css"
  echo "   Examples:"
  echo "   - #2E7D32 → bg-primary or text-primary"
  echo "   - rgba(0,0,0,0.1) → shadow-card or border-border"
  echo ""
  exit 1
else
  echo "✅ No hardcoded colors found in changed files. All good!"
  exit 0
fi
