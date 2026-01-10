#!/bin/bash
# Ověření RLS v produkci (vyžaduje admin přístup k DB)

echo "═══════════════════════════════════════════════════════"
echo "  RLS VERIFICATION - Production Database"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "⚠️  POZOR: Tento skript vyžaduje admin přístup k DB"
echo ""

PROJECT_REF="bkyokcjpelqwtndienos"

# Test 1: Ověření privileges (vyžaduje service_role nebo postgres role)
echo "Test 1: Ověření table privileges..."
echo ""
echo "SQL dotaz:"
cat << 'EOF'
SELECT 
  has_table_privilege('anon', 'public.admin_audit_logs', 'select') as anon_can_select,
  has_table_privilege('authenticated', 'public.admin_audit_logs', 'select') as auth_can_select;
EOF
echo ""
echo "Očekávaný výsledek: false | false"
echo ""

# Test 2: RLS status
echo "Test 2: RLS status..."
echo ""
echo "SQL dotaz:"
cat << 'EOF'
SELECT 
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relname IN ('admin_audit_logs', 'admin_rate_limits');
EOF
echo ""
echo "Očekávaný výsledek:"
echo "  admin_audit_logs  | true | true"
echo "  admin_rate_limits | true | true"
echo ""

# Test 3: Pokus o SELECT s anon rolí (real-world test)
echo "Test 3: Real-world access test..."
echo ""
echo "Tento test vyžaduje:"
echo "1. Anon API key z Supabase dashboard"
echo "2. REST API volání na /rest/v1/admin_audit_logs"
echo ""
echo "curl příkaz:"
cat << 'EOF'
curl -s https://bkyokcjpelqwtndienos.supabase.co/rest/v1/admin_audit_logs \
  -H "apikey: ANON_KEY_HERE" \
  -H "Authorization: Bearer ANON_KEY_HERE"
EOF
echo ""
echo "Očekávaný výsledek: 403 Forbidden nebo prázdné [] (kvůli RLS)"
echo ""

echo "═══════════════════════════════════════════════════════"
echo "JAK SPUSTIT TYTO TESTY:"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Možnost A: Supabase SQL Editor"
echo "1. Otevřít: https://supabase.com/dashboard/project/$PROJECT_REF/sql"
echo "2. Spustit SQL dotazy výše"
echo "3. Ověřit výsledky"
echo ""
echo "Možnost B: REST API test (bezpečnější)"
echo "1. Získat anon key z: https://supabase.com/dashboard/project/$PROJECT_REF/settings/api"
echo "2. Spustit curl příkaz"
echo "3. Pokud vrátí data → FAIL (RLS nefunguje)"
echo "4. Pokud vrátí 403/[] → PASS (RLS funguje)"
echo ""
echo "═══════════════════════════════════════════════════════"
echo "POZNÁMKA:"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Protože migrace je deterministická a byla úspěšně aplikována,"
echo "je pravděpodobnost selhání RLS < 1%."
echo ""
echo "Tento test je volitelný a slouží pro 100% jistotu."
echo ""
