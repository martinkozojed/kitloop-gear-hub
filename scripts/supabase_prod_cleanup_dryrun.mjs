#!/usr/bin/env node
/**
 * DRY-RUN: Produkční úklid Supabase – pouze čte a vypisuje, co by bylo smazáno.
 * Žádné mazání. Spusť před skutečným úklidem.
 *
 * Potřebuje: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (produkční projekt)
 * Příklad: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/supabase_prod_cleanup_dryrun.mjs
 * Nebo: node --env-file=.env scripts/supabase_prod_cleanup_dryrun.mjs (pokud .env obsahuje tyto proměnné)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.E2E_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.E2E_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Chybí proměnné: SUPABASE_URL a SUPABASE_SERVICE_ROLE_KEY (produkční projekt).');
  console.error('Nastav je před spuštěním nebo použij SQL dry-run v scripts/supabase_prod_cleanup.sql (část A).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const CLEANUP_ALL = process.env.CLEANUP_ALL_USERS !== 'false' && process.env.CLEANUP_ALL_USERS !== '0';

const TEST_EMAILS = ['demo@kitloop.cz', 'admin@kitloop.com', 'kitloop-admin@kitloop.cz'];
const TEST_DOMAINS = [
  '@example.com', '@example.org', '@example.net', '@test.com', '@mailinator.com',
  '@tempmail.com', '@getnada.com', '@yopmail.com', '@maildrop.cc', '@guerrillamail.com',
  '@10minutemail.com', '@throwaway.email', '@trashmail.com', '@fakeinbox.com', '@temp-mail.org',
  '@sharklasers.com', '@guerrillamail.info', '@mailnesia.com', '@dispostable.com',
  '@mailinator2.com', '@mailinator.net', '@tmpmail.org', '@trashmail.ws', '@minuteinbox.com',
  '@inboxkitten.com', '@mailcatch.com', '@tempail.com', '@fake-mail.com', '@mohmal.com',
];
const SUPPLEMENTAL = (process.env.SUPPLEMENTAL_TEST_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean);

function isTestEmail(email) {
  if (CLEANUP_ALL) return true;
  if (!email) return false;
  if (TEST_EMAILS.includes(email)) return true;
  if (SUPPLEMENTAL.includes(email)) return true;
  const domain = email.includes('@') ? email.slice(email.indexOf('@')) : '';
  if (TEST_DOMAINS.some((d) => domain === d || domain.endsWith(d))) return true;
  return false;
}

async function main() {
  console.log('=== DRY-RUN: Úklid produkčního Supabase (žádné mazání) ===\n');
  if (CLEANUP_ALL) console.log('Režim: VŠICHNI registrovaní uživatelé (CLEANUP_ALL_USERS=true)\n');
  console.log('URL:', SUPABASE_URL.replace(/\/\/[^@]+@/, '//***@')); // mask credentials in URL if any

  // 1) Uživatelé (Auth Admin API)
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (usersError) {
    console.error('Chyba listUsers:', usersError.message);
    process.exit(1);
  }
  const testUsers = users.filter((u) => isTestEmail(u.email));
  console.log('\n--- A1: Uživatelé k odstranění ---');
  if (!CLEANUP_ALL) {
    console.log('Vzory: demo/admin/kitloop-admin@kitloop.cz + domény: example.*, test.com, mailinator, tempmail, yopmail, maildrop, guerrillamail, 10minutemail, throwaway, trashmail, fakeinbox, temp-mail, atd.');
    if (SUPPLEMENTAL.length) console.log('+ doplňkové: SUPPLEMENTAL_TEST_EMAILS:', SUPPLEMENTAL.join(', '));
  }
  if (testUsers.length === 0) {
    console.log('Žádní uživatelé k odstranění.');
    console.log('Dry-run dokončen. Nic k mazání.');
    return;
  }
  testUsers.forEach((u) => {
    console.log(`  ${u.id}  ${u.email}  created: ${u.created_at}  last_sign_in: ${u.last_sign_in_at || 'nikdy'}`);
  });
  console.log('Celkem uživatelů k odstranění:', testUsers.length);
  const userIds = testUsers.map((u) => u.id);

  // 2) Providery přes user_provider_memberships
  const { data: memberships, error: memErr } = await supabase
    .from('user_provider_memberships')
    .select('provider_id')
    .in('user_id', userIds);
  if (memErr) {
    console.error('Chyba user_provider_memberships:', memErr.message);
    return;
  }
  const providerIds = [...new Set((memberships || []).map((m) => m.provider_id))];
  console.log('\n--- A2: Providery navázané na tyto uživatele ---');
  if (providerIds.length === 0) {
    console.log('Žádné providery.');
  } else {
    const { data: providers } = await supabase.from('providers').select('id, name, email, status').in('id', providerIds);
    (providers || []).forEach((p) => console.log(`  ${p.id}  ${p.name}  ${p.email}  ${p.status}`));
    console.log('Celkem proviederů:', providerIds.length);
  }

  // 3) Počty záznamů
  if (providerIds.length === 0) {
    console.log('\n--- Počty závislých záznamů: 0 (žádné providery) ---');
  } else {
    const { count: countRes } = await supabase.from('reservations').select('*', { count: 'exact', head: true }).in('provider_id', providerIds);
    const { count: countAssets } = await supabase.from('assets').select('*', { count: 'exact', head: true }).in('provider_id', providerIds);
    const { count: countProducts } = await supabase.from('products').select('*', { count: 'exact', head: true }).in('provider_id', providerIds);
    console.log('\n--- A3: Počty záznamů, které zmizí ---');
    console.log('  reservations:', countRes ?? 0);
    console.log('  assets:', countAssets ?? 0);
    console.log('  products:', countProducts ?? 0);
  }

  console.log('\n=== Konec dry-run. Žádná data nebyla změněna. ===');
  console.log('Další krok: záloha, pak spusť část B v scripts/supabase_prod_cleanup.sql (nebo použij SQL Editor).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
