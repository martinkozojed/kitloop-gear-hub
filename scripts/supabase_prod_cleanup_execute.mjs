#!/usr/bin/env node
/**
 * Úklid Supabase – smaže VŠECHNY registrované uživatele a jejich data (úplný reset).
 * Používá SUPABASE_URL a SUPABASE_SERVICE_ROLE_KEY (nebo E2E_*) z env.
 *
 *   node --env-file=.env.staging scripts/supabase_prod_cleanup_execute.mjs
 *
 * Jen testovací e-maily (ne vše): CLEANUP_ALL_USERS=false node ...
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.E2E_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.E2E_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Chybí SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY');
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

async function run() {
  if (CLEANUP_ALL) {
    console.log('Režim: SMAZAT VŠECHNY registrované uživatele (CLEANUP_ALL_USERS=true).');
  }
  console.log('Úklid Supabase – načítám data...');
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (usersError) {
    console.error('listUsers:', usersError.message);
    process.exit(1);
  }
  const testUsers = users.filter((u) => isTestEmail(u.email));
  if (testUsers.length === 0) {
    console.log('Žádní uživatelé k odstranění. Hotovo.');
    return;
  }
  console.log('Počet uživatelů k odstranění:', testUsers.length);
  const userIds = testUsers.map((u) => u.id);

  const { data: memberships } = await supabase.from('user_provider_memberships').select('provider_id').in('user_id', userIds);
  const providerIds = [...new Set((memberships || []).map((m) => m.provider_id))];

  const { data: resList } = await supabase.from('reservations').select('id').in('provider_id', providerIds);
  const reservationIds = (resList || []).map((r) => r.id);

  const { data: productList } = await supabase.from('products').select('id').in('provider_id', providerIds);
  const productIds = (productList || []).map((p) => p.id);

  console.log('Mazání v pořadí (respektování FK)...');

  if (reservationIds.length) {
    await supabase.from('reservation_assignments').delete().in('reservation_id', reservationIds);
    await supabase.from('reservation_lines').delete().in('reservation_id', reservationIds);
  }
  const { error: rrErr } = await supabase.from('return_reports').delete().in('reservation_id', reservationIds);
  if (rrErr && rrErr.code !== 'PGRST116') console.warn('return_reports:', rrErr.message);

  if (providerIds.length) {
    await supabase.from('reservation_requests').delete().in('provider_id', providerIds);
    await supabase.from('reservations').delete().in('provider_id', providerIds);
    await supabase.from('assets').delete().in('provider_id', providerIds);
  }
  if (productIds.length) {
    await supabase.from('product_variants').delete().in('product_id', productIds);
  }
  if (providerIds.length) {
    await supabase.from('products').delete().in('provider_id', providerIds);
  }

  await supabase.from('notification_outbox').delete().in('user_id', userIds);
  if (providerIds.length) {
    await supabase.from('app_events').delete().in('provider_id', providerIds);
    await supabase.from('app_events').delete().in('user_id', userIds);
    await supabase.from('onboarding_progress').delete().in('provider_id', providerIds);
  }

  await supabase.from('user_provider_memberships').delete().in('user_id', userIds);
  if (providerIds.length) {
    await supabase.from('providers').delete().in('id', providerIds);
  }
  if (CLEANUP_ALL) {
    const { data: allProviders } = await supabase.from('providers').select('id');
    const remainingIds = (allProviders || []).map((p) => p.id);
    if (remainingIds.length) {
      await supabase.from('providers').delete().in('id', remainingIds);
    }
  } else {
    const allTestEmails = [...TEST_EMAILS, ...SUPPLEMENTAL];
    const extraProviderIds = new Set();
    if (allTestEmails.length) {
      const { data: p1 } = await supabase.from('providers').select('id').in('email', allTestEmails);
      (p1 || []).forEach((p) => extraProviderIds.add(p.id));
    }
    for (const d of TEST_DOMAINS) {
      const { data: p2 } = await supabase.from('providers').select('id').ilike('email', '%' + d);
      (p2 || []).forEach((p) => extraProviderIds.add(p.id));
    }
    if (extraProviderIds.size) {
      await supabase.from('providers').delete().in('id', [...extraProviderIds]);
    }
  }

  for (const u of testUsers) {
    const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
    if (delErr) console.warn('deleteUser', u.email, delErr.message);
    else console.log('Smazán uživatel:', u.email);
  }

  console.log('Úklid dokončen.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
