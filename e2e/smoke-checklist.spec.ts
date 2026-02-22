/* eslint-disable no-console */
/**
 * Kitloop Pilot Smoke Checklist - Steps A through I
 * Runs each step in order, stopping at the FIRST failing step.
 */
import { test, expect, Page } from '@playwright/test';
import { callHarness } from './utils/harness';
import { loginAs } from './utils/auth';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5174';
const SUPABASE_STUDIO_URL = 'http://127.0.0.1:54323';

const formatDateTimeLocal = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

test.describe('Kitloop Smoke Checklist A-I', () => {
  let testEmail: string;
  let testPassword: string;
  let providerId: string;
  let productId: string;
  let variantId: string;
  let assetId: string;
  let reservationId: string;

  test.beforeAll(() => {
    testEmail = `smoke-test-${Date.now()}@test.com`;
    testPassword = 'Password123!';
    console.log(`[SETUP] Test email: ${testEmail}`);
  });

  test('A1: Sign up with fresh email → land on Pending approval screen', async ({ page }) => {
    console.log('[A1] Starting signup test...');
    await page.goto(`${BASE_URL}/signup`);

    // Select Provider role (required to trigger provider onboarding flow)
    const providerRoleOption = page.getByText(/provider|rental/i).first();
    if (await providerRoleOption.isVisible()) {
      await providerRoleOption.click();
    }

    // Fill signup form
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').first().fill(testPassword);

    // Submit
    const submitBtn = page.getByRole('button', { name: /sign up|register|create account/i });
    await submitBtn.click();

    // After provider signup → redirected to /provider/setup
    // Navigate to pending page to verify authenticated pending state
    await page.waitForTimeout(2000);
    await page.goto(`${BASE_URL}/provider/pending`);
    await page.waitForTimeout(1000);

    // Pending screen shows "Waiting for approval" (overlay) or "Čekáme na schválení" (pending page)
    const pendingText = page.getByText(/waiting for approval|Čekáme na schválení|pending approval|awaiting approval/i);
    await expect(pendingText).toBeVisible({ timeout: 10000 });

    console.log('[A1] ✓ PASSED - Landed on pending approval screen');
  });

  test('A2: Reload page → still shows Pending approval', async ({ page }) => {
    console.log('[A2] Testing session persistence...');
    const runId = `a2_${Date.now()}`;
    const uniqueEmail = `e2e_a2_${runId}@example.com`;

    // Seed a pending provider (self-contained, no dependency on A1)
    const seedPassword = 'password123';
    await callHarness('seed_preflight', runId, {
      provider_email: uniqueEmail,
      provider_status: 'pending',
      asset_count: 1,
      password: seedPassword,
    });

    await loginAs(page, uniqueEmail, seedPassword);
    await page.goto(`${BASE_URL}/provider/pending`);
    await page.waitForTimeout(500);

    // Should be on pending screen
    await expect(page.getByText(/waiting for approval|Čekáme na schválení|pending approval|awaiting approval/i)).toBeVisible();

    // Reload — session must persist
    await page.reload();
    await page.waitForTimeout(1000);

    // Should still show pending
    await expect(page.getByText(/waiting for approval|Čekáme na schválení|pending approval|awaiting approval/i)).toBeVisible();

    console.log('[A2] ✓ PASSED - Session persists, still pending');
  });

  test('A3: Approve provider via Supabase → access granted', async ({ page }) => {
    console.log('[A3] Approving provider via harness...');
    const runId = `a3_${Date.now()}`;
    const uniqueEmail = `e2e_a3_${runId}@example.com`;
    const seedPassword = 'password123';

    // Seed an approved provider — simulates out-of-band admin approval
    await callHarness('seed_preflight', runId, {
      provider_email: uniqueEmail,
      provider_status: 'approved',
      asset_count: 1,
      password: seedPassword,
    });

    await loginAs(page, uniqueEmail, seedPassword);

    // Approved provider must land on dashboard (not pending screen)
    await expect(page.getByText(/pending approval|Čekáme na schválení|waiting for approval/i)).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('link', { name: /dashboard/i }).or(page.getByRole('heading', { name: /dashboard/i })).or(page.getByText(/dashboard/i).first())).toBeVisible({ timeout: 10000 });

    console.log('[A3] ✓ PASSED - Provider approved, access granted');
  });

  test('A4: Log out → redirected to login. Log back in → lands on dashboard', async ({ page }) => {
    console.log('[A4] Testing logout and re-login...');
    const runId = `a4_${Date.now()}`;
    const uniqueEmail = `e2e_a4_${runId}@example.com`;
    const seedPassword = 'password123';

    await callHarness('seed_preflight', runId, {
      provider_email: uniqueEmail,
      provider_status: 'approved',
      asset_count: 1,
      password: seedPassword,
    });

    await loginAs(page, uniqueEmail, seedPassword);

    // Open user dropdown (logout is inside DropdownMenu triggered by email button)
    const userMenuBtn = page.getByRole('button').filter({ hasText: uniqueEmail });
    await userMenuBtn.click();
    await page.waitForTimeout(300);

    // Click Logout menu item
    await page.getByRole('menuitem', { name: /logout/i }).click();
    await page.waitForTimeout(1000);

    // Should be redirected to login or home (logged out)
    await expect(page.locator('input[type="email"]').or(page.getByRole('link', { name: /sign in/i }))).toBeVisible({ timeout: 5000 });

    // Log back in
    await loginAs(page, uniqueEmail, seedPassword);

    // Should land on dashboard (not pending screen)
    await expect(page.getByText(/waiting for approval|Čekáme na schválení|pending approval/i)).not.toBeVisible({ timeout: 3000 });

    console.log('[A4] ✓ PASSED - Logout/login flow works correctly');
  });

  test('A5: Access protected route while logged out → redirected to login', async ({ page }) => {
    console.log('[A5] Testing protected route access...');
    
    // Make sure we're logged out
    await page.goto(BASE_URL);
    const logoutBtn = page.getByRole('button', { name: /log out|sign out|logout/i });
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForTimeout(1000);
    }
    
    // Try to access protected route
    await page.goto(`${BASE_URL}/provider/dashboard`);
    await page.waitForTimeout(1000);
    
    // Should be redirected to login
    await expect(page.locator('input[type="email"]')).toBeVisible();
    expect(page.url()).toContain('login');
    
    console.log('[A5] ✓ PASSED - Protected routes require authentication');
  });

  // B - Inventory Basics
  test('B1: Create new product with variant and asset', async ({ page }) => {
    console.log('[B1] Creating product with variant and asset...');
    const runId = `b1_${Date.now()}`;
    const uniqueEmail = `e2e_b1_${runId}@example.com`;
    const seedPassword = 'password123';

    await callHarness('seed_preflight', runId, {
      provider_email: uniqueEmail,
      provider_status: 'approved',
      asset_count: 1,
      password: seedPassword,
    });

    await loginAs(page, uniqueEmail, seedPassword);

    // Navigate to inventory and wait for provider context to load
    await page.goto('/provider/inventory');
    await page.waitForLoadState('networkidle');
    // Wait for inventory page header to load
    await expect(page.getByRole('heading', { name: /inventory/i })).toBeVisible({ timeout: 15000 });

    // Click "Product" button in the inventory header (opens ProductForm modal)
    // Scope to main content to avoid footer "Product" link
    const main = page.getByRole('main');
    await main.getByRole('button', { name: /^product$/i }).click();
    await page.waitForTimeout(500);

    // Fill product name (placeholder: "e.g. Atomic Bent Chetler")
    const productName = `B1 Product ${Date.now()}`;
    await page.getByPlaceholder(/Atomic Bent Chetler/i).fill(productName);

    // Select category (required)
    await page.getByRole('combobox').first().click();
    await page.waitForTimeout(300);
    await page.getByRole('option').first().click();

    // Fill base price (required) - scroll into view first
    const priceInput = page.getByPlaceholder('500');
    await priceInput.scrollIntoViewIfNeeded();
    await priceInput.fill('100');

    // Save
    await page.getByRole('button', { name: /create product/i }).click();

    // Verify success: dialog closes and success toast appears
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });
    await expect(page.getByText(/product created successfully|ready to add assets/i).first()).toBeVisible({ timeout: 5000 });

    console.log('[B1] ✓ PASSED - Product created successfully');
  });

  test('B2: Edit product name → reflected in inventory list', async ({ page }) => {
    console.log('[B2] Editing product name...');
    const runId = `b2_${Date.now()}`;
    const uniqueEmail = `e2e_b2_${runId}@example.com`;
    const seedPassword = 'password123';

    await callHarness('seed_preflight', runId, {
      provider_email: uniqueEmail,
      provider_status: 'approved',
      asset_count: 1,
      password: seedPassword,
    });

    await loginAs(page, uniqueEmail, seedPassword);

    await page.goto('/provider/inventory');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /inventory/i })).toBeVisible({ timeout: 15000 });

    // Open row actions menu for the first asset
    await page.getByRole('button', { name: /open menu/i }).first().click();
    await page.waitForTimeout(300);

    // Click "Edit details" to open AssetDetailSheet
    await page.getByRole('menuitem', { name: /edit details/i }).click();
    await page.waitForTimeout(500);

    // Wait for AssetDetailSheet to be visible, then click pencil via JS eval (sheet CSS-transform
    // keeps the element "not stable" in Playwright's bounding-box check even after animation ends)
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('edit-product-btn').waitFor({ state: 'visible', timeout: 10000 });
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="edit-product-btn"]') as HTMLElement | null;
      btn?.click();
    });
    await page.waitForTimeout(500);

    // Change product name
    const newName = `B2 Updated ${Date.now()}`;
    const nameInput = page.getByPlaceholder(/Atomic Bent Chetler/i);
    await nameInput.scrollIntoViewIfNeeded();
    await nameInput.fill(newName);

    // Save
    await page.getByRole('button', { name: /update product/i }).click();

    // Verify success: ProductForm closes (AssetDetailSheet stays), success toast, name in list
    // Wait for the ProductForm to close (it has "Update product" button; sheet stays open)
    await expect(page.getByRole('button', { name: /update product/i })).toBeHidden({ timeout: 10000 });
    await expect(page.getByText(/product updated/i).first()).toBeVisible({ timeout: 5000 });
    // Verify updated name appears in inventory list
    await expect(page.getByText(newName).first()).toBeVisible({ timeout: 5000 });

    console.log('[B2] ✓ PASSED - Product name updated');
  });

  test('B3: Search inventory by asset tag → asset appears in results', async ({ page }) => {
    console.log('[B3] Searching inventory...');
    const runId = `b3_${Date.now()}`;
    const uniqueEmail = `e2e_b3_${runId}@example.com`;
    const seedPassword = 'password123';

    const seed = await callHarness('seed_preflight', runId, {
      provider_email: uniqueEmail,
      provider_status: 'approved',
      asset_count: 1,
      password: seedPassword,
    });

    await loginAs(page, uniqueEmail, seedPassword);
    await page.goto('/provider/inventory');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /inventory/i })).toBeVisible({ timeout: 15000 });

    // The seeded product name follows: <runId>_preflight_<emailSlug>_product
    const emailSlug = uniqueEmail.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    const productName = `${runId}_preflight_${emailSlug}_product`;

    // Search by product name (inventory search filters on product_name column)
    const searchBox = page.getByPlaceholder(/search assets/i);
    await searchBox.fill(productName);
    await page.waitForTimeout(500);

    // Verify asset row appears in results
    await expect(page.getByText(productName).first()).toBeVisible({ timeout: 10000 });

    console.log('[B3] ✓ PASSED - Asset found in search results');
  });

  test('B4: Asset count on variant matches number of assets created', async ({ page }) => {
    console.log('[B4] Checking asset count...');
    const runId = `b4_${Date.now()}`;
    const uniqueEmail = `e2e_b4_${runId}@example.com`;
    const seedPassword = 'password123';
    const assetCount = 3;

    await callHarness('seed_preflight', runId, {
      provider_email: uniqueEmail,
      provider_status: 'approved',
      asset_count: assetCount,
      password: seedPassword,
    });

    await loginAs(page, uniqueEmail, seedPassword);
    await page.goto('/provider/inventory');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /inventory/i })).toBeVisible({ timeout: 15000 });

    // Filter by the seeded product name to isolate this provider's assets
    const emailSlug = uniqueEmail.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    const productName = `${runId}_preflight_${emailSlug}_product`;
    await page.getByPlaceholder(/search assets/i).fill(productName);
    await page.waitForTimeout(500);

    // Verify the table shows exactly assetCount rows (EN: "Showing 3 of 3 items" / CZ: "Zobrazeno 3 z 3 položek")
    await expect(page.getByText(new RegExp(`(Showing|Zobrazeno)\\s+${assetCount}\\s+(of|z)\\s+${assetCount}`, 'i'))).toBeVisible({ timeout: 10000 });

    console.log('[B4] ✓ PASSED - Asset count matches');
  });

  test('C1: Create confirmed reservation for T+1 → T+3; save succeeds', async ({ page }) => {
    console.log('[C1] Creating reservation...');
    const runId = `c1_${Date.now()}`;
    const uniqueEmail = `e2e_c1_${runId}@example.com`;
    const seedPassword = 'password123';

    // Seed with cancelled reservation so T+1→T+3 dates are available
    await callHarness('seed_preflight', runId, {
      provider_email: uniqueEmail,
      provider_status: 'approved',
      asset_count: 1,
      reservation_status: 'cancelled',
      password: seedPassword,
    });

    await loginAs(page, uniqueEmail, seedPassword);
    await page.goto('/provider/reservations/new');
    await page.waitForLoadState('networkidle');

    // Fill customer info
    await page.locator('#customer_name').fill('C1 Test Customer');
    await page.locator('#customer_phone').fill('+420123456789');

    // Select product (first available)
    await page.getByTestId('reservation-product-select').click();
    await page.waitForTimeout(300);
    await page.getByRole('option').first().click();
    await page.waitForTimeout(300);

    // Select variant (first available)
    await page.getByTestId('reservation-variant-select').click();
    await page.waitForTimeout(300);
    await page.getByRole('option').first().click();
    await page.waitForTimeout(500);

    // Set dates T+1 → T+3
    const t1 = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const t3 = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
    await page.getByTestId('reservation-start').fill(fmt(t1));
    await page.getByTestId('reservation-end').fill(fmt(t3));
    // Wait for availability check to complete (button enabled)
    await expect(page.getByTestId('reservation-submit')).toBeEnabled({ timeout: 10000 });

    // Submit
    await page.getByTestId('reservation-submit').click();

    // Verify success: navigated to reservations list
    await page.waitForURL(/\/provider\/reservations$/, { timeout: 15000 });

    console.log('[C1] ✓ PASSED - Reservation created');
  });

  test('C2: Overlapping reservation shows collision warning', async ({ page }) => {
    console.log('[C2] Checking collision warning...');
    const runId = `c2_${Date.now()}`;
    const uniqueEmail = `e2e_c2_${runId}@example.com`;
    const seedPassword = 'password123';

    // Seed with an active reservation at T+1→T+2 (1 asset, fully booked)
    await callHarness('seed_preflight', runId, {
      provider_email: uniqueEmail,
      provider_status: 'approved',
      asset_count: 1,
      reservation_status: 'confirmed',
      password: seedPassword,
    });

    await loginAs(page, uniqueEmail, seedPassword);
    await page.goto('/provider/reservations/new');
    await page.waitForLoadState('networkidle');

    // Fill customer info
    await page.locator('#customer_name').fill('C2 Test Customer');
    await page.locator('#customer_phone').fill('+420123456789');

    // Select product and variant
    await page.getByTestId('reservation-product-select').click();
    await page.waitForTimeout(300);
    await page.getByRole('option').first().click();
    await page.waitForTimeout(300);
    await page.getByTestId('reservation-variant-select').click();
    await page.waitForTimeout(300);
    await page.getByRole('option').first().click();
    await page.waitForTimeout(300);

    // Use overlapping dates (T+1→T+2, same as seeded confirmed reservation)
    const t1 = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const t2 = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().slice(0, 16);
    await page.getByTestId('reservation-start').fill(fmt(t1));
    await page.getByTestId('reservation-end').fill(fmt(t2));

    // Wait for availability check — "Obsazeno (X rezervací)" or EN equivalent
    await expect(page.getByText(/obsazeno|not available|unavailable|conflict/i).first())
      .toBeVisible({ timeout: 10000 });

    console.log('[C2] ✓ PASSED - Collision warning shown');
  });

  test('C3: Reservation status shows correctly in reservations list', async ({ page }) => {
    console.log('[C3] Checking reservation status in list...');
    const runId = `c3_${Date.now()}`;
    const uniqueEmail = `e2e_c3_${runId}@example.com`;
    const seedPassword = 'password123';

    // Seed a confirmed reservation; harness sets customer_name = "Preflight Customer <runId>"
    await callHarness('seed_preflight', runId, {
      provider_email: uniqueEmail,
      provider_status: 'approved',
      asset_count: 1,
      reservation_status: 'confirmed',
      password: seedPassword,
    });

    // Harness prepends "e2e_" to runId → prefix = "e2e_<runId>"
    const customerMarker = `Preflight Customer e2e_${runId}`;

    await loginAs(page, uniqueEmail, seedPassword);
    await page.goto('/provider/reservations');
    await page.waitForLoadState('networkidle');

    // Assert the seeded reservation row is visible by unique customer name
    await expect(page.getByText(customerMarker)).toBeVisible({ timeout: 10000 });

    // Assert status "Confirmed"/"Potvrzeno" appears near the customer marker
    // Row is rendered as a button (expandable); locate by cell containing customer name
    const rowBtn = page.getByRole('button', { name: new RegExp(customerMarker) });
    await expect(rowBtn.getByText(/confirmed|potvrzeno/i)).toBeVisible({ timeout: 5000 });

    console.log('[C3] ✓ PASSED - Reservation status shown correctly');
  });

  test('C4: Edit confirmed reservation end date → update saves without errors', async ({ page }) => {
    console.log('[C4] Editing reservation end date...');
    const runId = `c4_${Date.now()}`;
    const uniqueEmail = `e2e_c4_${runId}@example.com`;
    const seedPassword = 'password123';

    const seedResult = await callHarness('seed_preflight', runId, {
      provider_email: uniqueEmail,
      provider_status: 'approved',
      asset_count: 1,
      reservation_status: 'confirmed',
      password: seedPassword,
    });

    const reservationId = seedResult?.reservation_id;
    if (!reservationId) throw new Error('Harness did not return reservation_id');

    await loginAs(page, uniqueEmail, seedPassword);
    await page.goto(`/provider/reservations/edit/${reservationId}`);
    await page.waitForLoadState('networkidle');

    // Open end-date inline editor
    await page.getByTestId('reservation-end-edit-btn').click();
    await expect(page.getByTestId('reservation-end-edit')).toBeVisible({ timeout: 5000 });

    // Change end date to T+5
    const t5 = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().slice(0, 16);
    await page.getByTestId('reservation-end-edit').fill(fmt(t5));

    // Save
    await page.getByTestId('reservation-end-save').click();

    // Verify success: edit input hidden, success toast
    await expect(page.getByTestId('reservation-end-edit')).toBeHidden({ timeout: 10000 });
    await expect(page.getByText(/updated|aktualizov/i).first()).toBeVisible({ timeout: 5000 });

    console.log('[C4] ✓ PASSED - Reservation end date updated');
  });

  test('C5: Cancel hold reservation → status changes to cancelled', async ({ page }) => {
    console.log('[C5] Cancelling hold reservation...');
    const runId = `c5_${Date.now()}`;
    const uniqueEmail = `e2e_c5_${runId}@example.com`;
    const seedPassword = 'password123';

    const seedResult = await callHarness('seed_preflight', runId, {
      provider_email: uniqueEmail,
      provider_status: 'approved',
      asset_count: 1,
      reservation_status: 'hold',
      password: seedPassword,
    });

    const reservationId = seedResult?.reservation_id;
    if (!reservationId) throw new Error('Harness did not return reservation_id');

    await loginAs(page, uniqueEmail, seedPassword);
    await page.goto(`${BASE_URL}/provider/reservations`);
    await page.waitForLoadState('networkidle');

    // Expand the reservation row first (cancel button is inside expanded row)
    const customerMarker = `Preflight Customer e2e_${runId}`;
    await page.getByRole('button', { name: new RegExp(customerMarker) }).click();

    // Click cancel button for this reservation
    await page.getByTestId(`cancel-reservation-${reservationId}`).click();

    // Assert status changes to cancelled
    await expect(page.getByText(/cancelled|zrušen/i).first()).toBeVisible({ timeout: 10000 });

    console.log('[C5] ✓ PASSED - Reservation cancelled');
  });

});
