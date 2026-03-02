#!/bin/bash
# scripts/prevent-data-loss.sh
# Scans added rows in recent SQL migrations for destructive operations.

BASE_REF="${1:-origin/main}"
echo "🛡️  Checking migrations for destructive ops (Data-Loss Guard)"
echo "   Comparing against ${BASE_REF}"
echo "--------------------------------------------------------"

# Find lines added in supabase/migrations/
# We only care about lines added (+) in .sql files in that dir
ADDED_LINES=$(git diff --unified=0 "$BASE_REF...HEAD" -- "supabase/migrations/*.sql" 2>/dev/null | grep "^+" | grep -v "^+++")

if [ -z "$ADDED_LINES" ]; then
  echo "✅ No new migration lines found."
  exit 0
fi

# Define the forbidden patterns (case-insensitive regex)
# DROP TABLE
# DROP COLUMN
# TRUNCATE
# DELETE FROM without WHERE (simple naive check)
PATTERN="\b(DROP\s+TABLE|DROP\s+COLUMN|TRUNCATE|DELETE\s+FROM[\sA-Za-z0-9_]+;$|DELETE\s+FROM\s+[A-Za-z0-9_]+\s*$)\b"

# Check if the migration author provided an override tag
OVERRIDE_TAG="-- data-loss-approved: ADR-"

# Scan the added lines
VIOLATIONS=$(echo "$ADDED_LINES" | grep -Ei "$PATTERN" || true)

if [ -n "$VIOLATIONS" ]; then
  # We found potential destructive operations
  echo "⚠️  WARNING: Destructive operations detected in new migrations!"
  echo "$VIOLATIONS" | sed 's/^/   /g'
  
  # Check for ADR override tag in the added lines
  HAS_OVERRIDE=$(echo "$ADDED_LINES" | grep -F "$OVERRIDE_TAG" || true)
  
  if [ -n "$HAS_OVERRIDE" ]; then
    echo "--------------------------------------------------------"
    echo "✅ Valid override tag found ($OVERRIDE_TAG...)."
    echo "   Allowing destructive operation to pass."
    exit 0
  else
    echo "--------------------------------------------------------"
    echo "❌ FATAL: Operations that drop tables/columns or blindly delete/truncate data are BLOCKED."
    echo "   To forcefully bypass this check, write an ADR and add this comment line to your migration:"
    echo "   -- data-loss-approved: ADR-00XX"
    exit 1
  fi
else
  echo "✅ No destructive operations detected."
  exit 0
fi
