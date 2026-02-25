#!/bin/bash
# report-ui-violations.sh — Report-only UI SSOT violation counts (CI never fails).
# Usage:
#   npm run report:ui              # full repo (src)
#   npm run report:ui -- --provider   # provider/ops scope only (F4 accept: target 0 ad-hoc status, 0 surface opacity)
# Output: pattern → count → top files

SRC="${1:-src}"
SCOPE=""
if [ "$1" = "--provider" ]; then
  SCOPE="provider"
  shift
  # Provider/ops scope: pages + provider components + operations + dashboard (+ crm, reservations used in provider)
  SEARCH_DIRS="src/pages/provider src/components/provider src/components/operations src/components/dashboard src/components/crm src/components/reservations"
fi

if [ -n "$SCOPE" ]; then
  echo "UI SSOT violation report (scope=provider/ops)"
  echo "Dirs: $SEARCH_DIRS"
else
  echo "UI SSOT violation report (src=${SRC})"
fi
echo "========================================"

report_pattern() {
  local pattern="$1"
  local label="$2"
  local count
  if [ -n "$SCOPE" ]; then
    count=$(grep -rE --include="*.tsx" --include="*.ts" --include="*.css" "$pattern" $SEARCH_DIRS 2>/dev/null | wc -l | tr -d ' ')
    printf "%-45s %6s\n" "$label" "$count"
    grep -rE --include="*.tsx" --include="*.ts" --include="*.css" "$pattern" $SEARCH_DIRS 2>/dev/null | cut -d: -f1 | sort | uniq -c | sort -rn | head -5 | while read -r c f; do
      printf "    %5s %s\n" "$c" "$f"
    done
  else
    count=$(grep -rE --include="*.tsx" --include="*.ts" --include="*.css" "$pattern" "$SRC" 2>/dev/null | wc -l | tr -d ' ')
    printf "%-45s %6s\n" "$label" "$count"
    grep -rE --include="*.tsx" --include="*.ts" --include="*.css" "$pattern" "$SRC" 2>/dev/null | cut -d: -f1 | sort | uniq -c | sort -rn | head -5 | while read -r c f; do
      printf "    %5s %s\n" "$c" "$f"
    done
  fi
  echo ""
}

echo ""
report_pattern "bg-white" "bg-white"
report_pattern "shadow-sm" "shadow-sm"
report_pattern "backdrop-blur-" "backdrop-blur-*"
report_pattern "ring-primary|outline-primary" "ring-primary / outline-primary"
report_pattern "bg-(muted|card|background|popover|accent)/[0-9]+" "Surface opacity (muted/card/.../digit)"
report_pattern "bg-(amber|emerald|red|yellow|green|orange)-|text-(amber|emerald|red|yellow|green|orange)-" "Ad-hoc status (amber/emerald/...)"
# Pattern groups for ad-hoc status (makes it clear what to fix)
report_pattern_group() {
  local pattern="$1"
  local label="$2"
  local count
  if [ -n "$SCOPE" ]; then
    count=$(grep -rE --include="*.tsx" --include="*.ts" --include="*.css" "$pattern" $SEARCH_DIRS 2>/dev/null | wc -l | tr -d ' ')
  else
    count=$(grep -rE --include="*.tsx" --include="*.ts" --include="*.css" "$pattern" "$SRC" 2>/dev/null | wc -l | tr -d ' ')
  fi
  [ "$count" -gt 0 ] && printf "    %-28s %6s\n" "$label" "$count"
}
echo "  Pattern groups (ad-hoc status):"
report_pattern_group "bg-amber-|text-amber-" "bg-amber-* / text-amber-*"
report_pattern_group "bg-emerald-|text-emerald-" "bg-emerald-* / text-emerald-*"
report_pattern_group "bg-red-|text-red-" "bg-red-* / text-red-*"
report_pattern_group "bg-yellow-|text-yellow-" "bg-yellow-* / text-yellow-*"
report_pattern_group "bg-green-|text-green-" "bg-green-* / text-green-*"
report_pattern_group "bg-orange-|text-orange-" "bg-orange-* / text-orange-*"
echo ""

report_pattern "bg-(slate|gray)-|text-(slate|gray)-|border-(slate|gray)-" "Forbidden neutrals (slate/gray)"

if [ -z "$SCOPE" ]; then
  PROV_MARKETING=$(grep -rE 'variant="marketing"|variant='"'"'marketing'"'"'' src/pages/provider 2>/dev/null | wc -l | tr -d ' ')
  if [ "$PROV_MARKETING" -gt 0 ]; then
    echo "variant=\"marketing\" in provider (lint fails): $PROV_MARKETING"
    grep -rE 'variant="marketing"|variant='"'"'marketing'"'"'' src/pages/provider 2>/dev/null | cut -d: -f1 | sort -u
    echo ""
  fi
fi

echo "========================================"
if [ -n "$SCOPE" ]; then
  echo "F4 accept: Ad-hoc status + Surface opacity above should be 0 in provider/ops scope."
fi
echo "Done. Use this to prioritize; CI does not fail."
