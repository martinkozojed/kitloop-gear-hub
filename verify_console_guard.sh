#!/bin/bash
# =============================================================================
# P0 Console Guard - Release Candidate Verification
# =============================================================================
# Usage: ./verify_console_guard.sh
# Purpose: Verify console kill switch is present and no leaks in source code
# Exit: 0 = PASS, 1 = FAIL (blocks release)
# =============================================================================

set -e

echo "🔒 P0 Console Guard - Release Verification"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Track failures
FAILURES=0

fail() {
  echo -e "${RED}✗ FAIL:${NC} $1"
  FAILURES=$((FAILURES + 1))
}

# Step 1: Build
echo "📦 Step 1: Building production bundle..."
if npm run build > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Build complete"
else
  fail "Production build failed"
fi
echo ""

# Step 2: Verify kill switch in source
echo "🔍 Step 2: Checking source code kill switch..."
if grep -q "console.log = () => {};" src/main.tsx; then
  echo -e "${GREEN}✓${NC} Kill switch found in src/main.tsx"
else
  fail "Kill switch NOT found in src/main.tsx"
fi
echo ""

# Step 3: Verify kill switch in build
echo "🔍 Step 3: Checking production build..."
if grep -q "console\.log=()=>{}" dist/assets/*.js 2>/dev/null; then
  echo -e "${GREEN}✓${NC} Kill switch present in dist/ bundle"
else
  fail "Kill switch NOT found in dist/ bundle"
fi
echo ""

# Step 4: Check source code for console leaks
echo "🔍 Step 4: Scanning src/ for console.log/info/debug..."
CONSOLE_LEAKS=$(grep -r -n "console\.\(log\|info\|debug\)" src/ \
  --exclude-dir=node_modules \
  --include="*.ts" \
  --include="*.tsx" \
  --exclude="logger.ts" \
  --exclude="main.tsx" \
  2>/dev/null || true)

if [ -z "$CONSOLE_LEAKS" ]; then
  echo -e "${GREEN}✓${NC} No console leaks in src/ (excluding logger.ts, main.tsx)"
else
  fail "Console leaks found in source code:"
  echo -e "${RED}${CONSOLE_LEAKS}${NC}"
fi
echo ""

# Step 5: Count console usage in build
echo "📊 Step 5: Console usage analysis..."
echo "-----------------------------------"
grep -oh "console\.\w\+" dist/assets/*.js 2>/dev/null | sort | uniq -c | while read count method; do
  if [[ "$method" == "console.error" ]] || [[ "$method" == "console.warn" ]]; then
    echo -e "  ${GREEN}${count}${NC} ${method} ${GREEN}✓${NC} (functional)"
  elif [[ "$method" == "console.log" ]]; then
    if [[ "$count" -le 2 ]]; then
      echo -e "  ${YELLOW}${count}${NC} ${method} ${GREEN}✓${NC} (kill switch + Supabase)"
    else
      fail "Unexpected console.log count: ${count} (expected ≤2)"
    fi
  elif [[ "$method" == "console.info" ]] || [[ "$method" == "console.debug" ]]; then
    if [[ "$count" -eq 1 ]]; then
      echo -e "  ${YELLOW}${count}${NC} ${method} ${GREEN}✓${NC} (kill switch)"
    else
      fail "Unexpected ${method} count: ${count} (expected 1)"
    fi
  else
    echo -e "  ${YELLOW}${count}${NC} ${method} ${YELLOW}?${NC} (unknown)"
  fi
done
echo ""

# Step 6: Supabase config check
echo "🔍 Step 6: Checking Supabase config..."
if grep -q "debug: false" src/lib/supabase.ts; then
  echo -e "${GREEN}✓${NC} Supabase debug: false (layer 1)"
else
  echo -e "${YELLOW}⚠${NC}  Supabase debug config not found"
fi
echo ""

# Summary
echo "=========================================="
if [ $FAILURES -eq 0 ]; then
  echo -e "${GREEN}✅ RELEASE GATE: PASS${NC}"
  echo ""
  echo "Ready for staging deployment."
  echo "Next: Manual verification on staging"
  echo "See: docs/P0_SECURITY_RELEASE_GATE.md"
  exit 0
else
  echo -e "${RED}❌ RELEASE GATE: FAIL${NC}"
  echo ""
  echo "Found ${FAILURES} issue(s). Fix before deploying."
  exit 1
fi
