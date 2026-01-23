#!/bin/bash
set -euo pipefail

# Configuration
DB_URL="${SUPABASE_DB_URL:-postgres://postgres:postgres@127.0.0.1:54322/postgres}"

echo "Starting Backend Security Regression Check..."
# Mask the URL in output just in case
echo "Database URL: [REDACTED]"

# Track failures
EXIT_CODE=0

# 1. GATE: Check RLS on reservation_lines
echo ""
echo "---------------------------------------------------"
echo "1. [GATE] Checking RLS on 'reservation_lines'..."
echo "---------------------------------------------------"

# Fetch 't' or 'f' (or empty if table missing)
RLS_STATUS=$(psql "$DB_URL" -t -c "SELECT relrowsecurity FROM pg_class WHERE relname = 'reservation_lines';" | tr -d '[:space:]')

if [ "$RLS_STATUS" == "t" ]; then
    echo "✅ PASS: RLS is enabled on reservation_lines."
else
    echo "❌ FAIL: RLS is NOT enabled on reservation_lines (Expected 't', got '${RLS_STATUS:-NULL}')."
    EXIT_CODE=1
fi

# 2. REPORT: List Policies on reservation_lines (Informational Only)
echo ""
echo "---------------------------------------------------"
echo "2. [REPORT] Listing Policies on 'reservation_lines'..."
echo "---------------------------------------------------"
# Don't fail the script if this query fails (e.g. slight schema drift), though it shouldn't.
psql "$DB_URL" -c "
    SELECT polname, polcmd, polroles 
    FROM pg_policy 
    WHERE polrelid = 'public.reservation_lines'::regclass;" || echo "⚠️  Warning: Could not list policies."

# 3. GATE: Check for Insecure SECURITY DEFINER functions (Missing search_path)
echo ""
echo "---------------------------------------------------"
echo "3. [GATE] Audit: SECURITY DEFINER functions without search_path..."
echo "---------------------------------------------------"

INSECURE_FUNCS=$(psql "$DB_URL" -t -c "
    SELECT count(*)
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.prosecdef = true 
      AND (p.proconfig IS NULL OR NOT (p.proconfig::text LIKE '%search_path=public%'))
      AND pg_get_userbyid(p.proowner) != 'supabase_admin';
" | tr -d '[:space:]')

if [ "$INSECURE_FUNCS" == "0" ]; then
    echo "✅ PASS: No insecure SECURITY DEFINER functions found."
else
    echo "❌ FAIL: Found $INSECURE_FUNCS insecure SECURITY DEFINER functions!"
    echo "Listing culprits:"
    psql "$DB_URL" -c "
        SELECT p.proname, p.proconfig 
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
          AND p.prosecdef = true 
          AND (p.proconfig IS NULL OR NOT (p.proconfig::text LIKE '%search_path=public%')) 
          AND pg_get_userbyid(p.proowner) != 'supabase_admin';
    "
    EXIT_CODE=1
fi

echo ""
if [ "$EXIT_CODE" -eq 0 ]; then
    echo "Security Regression Check Passed."
else
    echo "Security Regression Check FAILED."
fi

exit $EXIT_CODE
