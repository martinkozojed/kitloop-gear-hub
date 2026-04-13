/**
 * Kit Bundles Atomicity — All-Or-Nothing rollback test.
 *
 * Seeds real data via service_role, sabotages one asset,
 * then verifies that issue_reservations_batch rolls back
 * the entire group when a single item fails the hard gate.
 */
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── Load .env (no dotenv dependency) ───────────────────────────────────────

try {
  const envPath = resolve(process.cwd(), '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
} catch { /* .env missing — rely on actual env vars */ }

// ─── Supabase clients ───────────────────────────────────────────────────────

const supabaseUrl = process.env.E2E_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.E2E_SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const admin = createClient(supabaseUrl, serviceRoleKey);

// Seed-data provider from supabase/seed.sql
const SEED_PROVIDER_ID = '11111111-1111-1111-1111-111111111111';
const SEED_USER_EMAIL = 'demo@kitloop.cz';
const SEED_USER_PASSWORD = 'password123';

// ─── Test ───────────────────────────────────────────────────────────────────

test.describe('Kit Bundles Atomicity & Data Safety', () => {
  test.describe.configure({ mode: 'serial' });

  // Track created IDs for cleanup
  let productA_id: string;
  let productB_id: string;
  let variantA_id: string;
  let variantB_id: string;
  let assetA_id: string;
  let assetB_id: string;
  let reservationA_id: string;
  let reservationB_id: string;
  let groupId: string;

  test.afterAll(async () => {
    // Cleanup test data (reverse FK order)
    await admin.from('reservation_assignments').delete().in('reservation_id', [reservationA_id, reservationB_id].filter(Boolean));
    await admin.from('reservations').delete().in('id', [reservationA_id, reservationB_id].filter(Boolean));
    await admin.from('assets').delete().in('id', [assetA_id, assetB_id].filter(Boolean));
    await admin.from('product_variants').delete().in('id', [variantA_id, variantB_id].filter(Boolean));
    await admin.from('products').delete().in('id', [productA_id, productB_id].filter(Boolean));
  });

  test('P0: issue_reservations_batch must fail atomically when one item has no available assets', async () => {
    const ts = Date.now();

    // ── 1. Seed: two products, each with one variant and one asset ──────

    const { data: pA } = await admin.from('products').insert({
      provider_id: SEED_PROVIDER_ID,
      name: `Atom-ProductA-${ts}`,
      category: 'test',
      base_price_cents: 10000,
    }).select('id').single();
    productA_id = pA!.id;

    const { data: pB } = await admin.from('products').insert({
      provider_id: SEED_PROVIDER_ID,
      name: `Atom-ProductB-${ts}`,
      category: 'test',
      base_price_cents: 15000,
    }).select('id').single();
    productB_id = pB!.id;

    const { data: vA } = await admin.from('product_variants').insert({
      product_id: productA_id,
      name: 'Variant-A',
      sku: `ATOM-A-${ts}`,
    }).select('id').single();
    variantA_id = vA!.id;

    const { data: vB } = await admin.from('product_variants').insert({
      product_id: productB_id,
      name: 'Variant-B',
      sku: `ATOM-B-${ts}`,
    }).select('id').single();
    variantB_id = vB!.id;

    const { data: aA } = await admin.from('assets').insert({
      provider_id: SEED_PROVIDER_ID,
      variant_id: variantA_id,
      asset_tag: `ATOM-A-${ts}`,
      status: 'available',
      condition_score: 100,
      location: 'Test Shelf',
    }).select('id').single();
    assetA_id = aA!.id;

    const { data: aB } = await admin.from('assets').insert({
      provider_id: SEED_PROVIDER_ID,
      variant_id: variantB_id,
      asset_tag: `ATOM-B-${ts}`,
      status: 'available',
      condition_score: 100,
      location: 'Test Shelf',
    }).select('id').single();
    assetB_id = aB!.id;

    // ── 2. Seed: two reservations in same group (simulating kit) ────────

    groupId = crypto.randomUUID();
    const startDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow
    const endDate = new Date(Date.now() + 2 * 86400000).toISOString(); // day after

    const { data: rA } = await admin.from('reservations').insert({
      provider_id: SEED_PROVIDER_ID,
      product_variant_id: variantA_id,
      customer_name: `Atomicity Test ${ts}`,
      customer_email: `atom-${ts}@test.local`,
      start_date: startDate,
      end_date: endDate,
      status: 'confirmed',
      payment_status: 'paid',
      total_price: 100,
      deposit_paid: true,
      amount_total_cents: 10000,
      currency: 'CZK',
      idempotency_key: `atom-a-${ts}`,
      group_id: groupId,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    }).select('id').single();
    reservationA_id = rA!.id;

    const { data: rB } = await admin.from('reservations').insert({
      provider_id: SEED_PROVIDER_ID,
      product_variant_id: variantB_id,
      customer_name: `Atomicity Test ${ts}`,
      customer_email: `atom-${ts}@test.local`,
      start_date: startDate,
      end_date: endDate,
      status: 'confirmed',
      payment_status: 'paid',
      total_price: 150,
      deposit_paid: true,
      amount_total_cents: 15000,
      currency: 'CZK',
      idempotency_key: `atom-b-${ts}`,
      group_id: groupId,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    }).select('id').single();
    reservationB_id = rB!.id;

    // ── 3. Assign assets to reservations ────────────────────────────────

    await admin.from('reservation_assignments').insert([
      { reservation_id: reservationA_id, asset_id: assetA_id },
      { reservation_id: reservationB_id, asset_id: assetB_id },
    ]);

    // ── 4. SABOTAGE: mark asset A as maintenance → unavailable ──────────

    await admin.from('assets').update({ status: 'maintenance' }).eq('id', assetA_id);

    // ── 5. Attempt batch issue via authenticated demo user ──────────────

    const userClient = createClient(supabaseUrl, anonKey);
    const { error: signInError } = await userClient.auth.signInWithPassword({
      email: SEED_USER_EMAIL,
      password: SEED_USER_PASSWORD,
    });
    expect(signInError).toBeNull();

    const { error: rpcError } = await userClient.rpc('issue_reservations_batch', {
      p_reservation_ids: [reservationA_id, reservationB_id],
      p_provider_id: SEED_PROVIDER_ID,
      p_user_id: SEED_PROVIDER_ID, // unused — RPC derives from auth.uid()
      p_override: false,
    });

    // ── 6. ASSERT: RPC must fail ────────────────────────────────────────

    expect(rpcError).not.toBeNull();
    expect(rpcError!.message).toMatch(/no available|issue failed/i);

    // ── 7. ASSERT: both reservations stayed 'confirmed' (rollback) ──────

    const { data: verifyRes } = await admin
      .from('reservations')
      .select('id, status')
      .in('id', [reservationA_id, reservationB_id]);

    expect(verifyRes).toHaveLength(2);
    for (const r of verifyRes!) {
      expect(r.status).toBe('confirmed');
    }

    // ── 8. ASSERT: no asset status leaked to 'active' ───────────────────

    const { data: verifyAssets } = await admin
      .from('assets')
      .select('id, status')
      .in('id', [assetA_id, assetB_id]);

    expect(verifyAssets).toHaveLength(2);
    const assetA = verifyAssets!.find(a => a.id === assetA_id);
    const assetB = verifyAssets!.find(a => a.id === assetB_id);
    expect(assetA!.status).toBe('maintenance'); // still sabotaged
    expect(assetB!.status).toBe('available');    // NOT 'active' — rollback worked

    // ── 9. ASSERT: no ghost assignments created ─────────────────────────

    const { data: verifyAssignments } = await admin
      .from('reservation_assignments')
      .select('reservation_id, returned_at')
      .in('reservation_id', [reservationA_id, reservationB_id]);

    // Original assignments should exist, none should have been modified
    for (const a of verifyAssignments || []) {
      expect(a.returned_at).toBeNull(); // not touched
    }

    // Sign out the test user
    await userClient.auth.signOut();
  });
});
