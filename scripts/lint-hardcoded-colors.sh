#!/bin/bash
# lint-hardcoded-colors.sh
# 1) FAIL if hardcoded colors (#hex or rgba()) are found in CHANGED TS/TSX files
# 2) FAIL if forbidden Tailwind utilities are used (surfaces/status/focus SSOT)
# Allowed for hex/rgba: index.css, tailwind.config.ts, DESIGN_TOKENS.md, theme, telemetry

set -e

echo "🔍 Checking for hardcoded colors in CHANGED files (no new violations mode)..."

# Allowed patterns (files where hardcoded hex/rgba are OK)
ALLOWED_PATTERN="index\.css|tailwind\.config\.ts|DESIGN_TOKENS\.md|theme|src/lib/telemetry\.ts"

# Get changed files compared to main branch (TS/TSX for hex; TS/TSX/CSS for forbidden utilities)
CHANGED_FILES=$(git diff --name-only origin/main...HEAD -- '***.ts' '***.tsx' 2>/dev/null || true)
CHANGED_UI_FILES=$(git diff --name-only origin/main...HEAD -- '***.ts' '***.tsx' '***.css' 2>/dev/null || true)

if [ -z "$CHANGED_FILES" ] && [ -z "$CHANGED_UI_FILES" ]; then
  echo "✅ No TS/TSX/CSS files changed."
  exit 0
fi

echo "Checking the following files:"
echo "$CHANGED_FILES"
echo "-----------------------------------------------------"

FOUND_VIOLATIONS=0
VIOLATIONS_OUTPUT=""

# --- Part 1: hex / rgba ---
for file in $CHANGED_FILES; do
  if [[ "$file" =~ $ALLOWED_PATTERN ]]; then
    continue
  fi
  if [ ! -f "$file" ]; then
    continue
  fi
  MATCHES=$(grep -E "(#[0-9a-fA-F]{3,8}|rgba?\s*\()" "$file" || true)
  if [ -n "$MATCHES" ]; then
    FOUND_VIOLATIONS=1
    VIOLATIONS_OUTPUT="${VIOLATIONS_OUTPUT}\n\n📄 File: $file (hex/rgba)\n$MATCHES"
  fi
done

# --- Part 2: forbidden Tailwind utilities (surfaces/status/focus SSOT) ---
# Skip DESIGN_TOKENS.md, docs/design/*.md (document forbidden patterns with examples) and this script
FORBIDDEN_SKIP="DESIGN_TOKENS\.md|docs/design/.*\.md|scripts/lint-hardcoded-colors\.sh"
# Global: focus + status ad-hoc + surface opacity drift (surfaces only; bg-status-*/10 and bg-brand/10 are allowed)
FORBIDDEN_PATTERN="bg-slate-|bg-gray-|text-slate-|text-gray-|border-slate-|border-gray-|text-amber-|bg-amber-|text-emerald-|bg-emerald-|ring-primary|bg-muted/[0-9]+|bg-card/[0-9]+|bg-background/[0-9]+|bg-popover/[0-9]+|bg-accent/[0-9]+"
# Provider pages only: no bg-white or shadow-sm (container drift; elsewhere e.g. dropdowns may use shadow-sm)
PROVIDER_BYPASS_PATTERN="bg-white|shadow-sm"

for file in $CHANGED_UI_FILES; do
  if [[ "$file" =~ $FORBIDDEN_SKIP ]]; then
    continue
  fi
  if [ ! -f "$file" ]; then
    continue
  fi
  MATCHES=$(grep -E "$FORBIDDEN_PATTERN" "$file" || true)
  if [ -n "$MATCHES" ]; then
    FOUND_VIOLATIONS=1
    VIOLATIONS_OUTPUT="${VIOLATIONS_OUTPUT}\n\n📄 File: $file (forbidden utilities)\n$MATCHES"
  fi
  # In provider pages, also flag bg-white and shadow-sm (bypass tokens)
  if [[ "$file" =~ ^src/pages/provider/ ]]; then
    BYPASS=$(grep -E "$PROVIDER_BYPASS_PATTERN" "$file" || true)
    if [ -n "$BYPASS" ]; then
      FOUND_VIOLATIONS=1
      VIOLATIONS_OUTPUT="${VIOLATIONS_OUTPUT}\n\n📄 File: $file (provider: use bg-card / shadow-xs or shadow-card)\n$BYPASS"
    fi
  fi
done

# --- Part 3: variant="marketing" forbidden in provider (SSOT: marketing variant only on public) ---
PROVIDER_MARKETING=$(grep -rE 'variant="marketing"|variant'"'"'marketing'"'"'' src/pages/provider/ 2>/dev/null || true)
if [ -n "$PROVIDER_MARKETING" ]; then
  FOUND_VIOLATIONS=1
  VIOLATIONS_OUTPUT="${VIOLATIONS_OUTPUT}\n\n📄 variant=\"marketing\" in provider (SSOT: allowed only on public pages)\n$PROVIDER_MARKETING"
fi

if [ "$FOUND_VIOLATIONS" -eq 1 ]; then
  echo ""
  echo "❌ FAIL: Hardcoded colors or forbidden utilities in CHANGED files:"
  echo "─────────────────────────────────────────────────────"
  echo -e "$VIOLATIONS_OUTPUT"
  echo "─────────────────────────────────────────────────────"
  echo ""
  echo "💡 Fix:"
  echo "   - Hex/rgba → use design tokens (bg-card, text-foreground, border-border, etc.)"
  echo "   - bg-slate-* / bg-gray-* → bg-background, bg-card, bg-muted, bg-accent, bg-popover"
  echo "   - text-slate-* / text-gray-* → text-foreground, text-muted-foreground"
  echo "   - text-amber-* / bg-amber-* / text-emerald-* / bg-emerald-* → status: bg-status-* / text-status-*"
  echo "   - ring-primary → ring-ring (focus is brand)"
  echo "   - In src/pages/provider/*: bg-white → bg-card; shadow-sm → shadow-xs or shadow-card"
  echo "   - variant=\"marketing\" → use only on public pages; forbidden in provider"
  echo "   - Surface opacity: bg-muted/50, bg-card/50, etc. → use full surface or bg-accent for hover (opacity allowed for bg-status-*/10, bg-brand/10)"
  echo ""
  exit 1
else
  echo "✅ No hardcoded colors or forbidden utilities in changed files. All good!"
  exit 0
fi
