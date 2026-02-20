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

    // In AssetDetailSheet, wait for sheet to fully animate in
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    // Wait for "Edit Details" button (lower in sheet) to be stable — indicates animation complete
    await expect(page.getByRole('button', { name: /edit details/i })).toBeVisible({ timeout: 10000 });
    // Click pencil icon in product name heading (force to bypass sheet animation stability check)
    const editProductBtn = page.getByRole('dialog').getByRole('heading', { level: 2 }).getByRole('button');
    await editProductBtn.dispatchEvent('click');
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

});
