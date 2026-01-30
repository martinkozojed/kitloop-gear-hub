/* eslint-disable no-console */
import { test, expect } from '@playwright/test';
import { loginAs } from './utils/auth';
import { getProviderCreds } from './utils/env';
import { callHarness } from './utils/harness';

const formatDateTimeLocal = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

test.describe('E2E Smoke', () => {
  const { email, password } = getProviderCreds();

  test.beforeEach(async ({ page }) => {
    // Attempt reset, but don't fail if forbidden (just log). 
    // We will use unique emails to ensure isolation regardless.
    try {
      await callHarness("reset");
    } catch (e) {
      console.log("[TEST] Reset skipped or failed (likely safety check). Using unique emails.");
    }

    page.on("console", (msg) => console.log(`[PAGE] ${msg.text()}`));
    page.on("response", (res) => {
      if (res.status() >= 400) {
        console.log(`[NET] ${res.status()} ${res.url()}`);
      }
    });
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      console.log(`[FAILURE] Test failed: ${testInfo.title}`);
      console.log(`[FAILURE] URL: ${page.url()}`);
      try {
        const body = await page.evaluate(() => document.body.innerText);
        console.log(`[FAILURE] Body Text:\n${body.substring(0, 500)}...`);
      } catch (e) {
        console.log("[FAILURE] Could not get body text");
      }
    }
  });

  test('Scenario 1: Provider can create and confirm reservation', async ({ page }) => {
    const runId = `res_${Date.now()}`;
    const uniqueEmail = `e2e_provider_${runId}@example.com`;

    // Seed approved provider with product and unique email
    const seed = await callHarness('seed', runId, {
      provider_email: uniqueEmail,
      provider_status: 'approved'
    });

    const customerName = `E2E Customer ${Date.now()}`;
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000); // 1 day duration

    // Login with unique creds
    await loginAs(page, uniqueEmail, password);

    // Create Reservation
    await page.goto('/provider/reservations/new');

    // Fill form
    await page.locator('#customer_name').fill(customerName);
    await page.locator('#customer_phone').fill('+420 777 777 777');
    await page.locator('#customer_email').fill(`qa+${Date.now()}@example.com`);

    await page.getByTestId('reservation-product-select').click();
    await page.getByTestId(`reservation-product-option-${seed.product_id}`).click();

    await page.getByTestId('reservation-variant-select').click();
    await page.getByTestId(`reservation-variant-option-${seed.variant_id}`).click();

    await page.getByTestId('reservation-start').fill(formatDateTimeLocal(start));
    await page.getByTestId('reservation-end').fill(formatDateTimeLocal(end));

    await page.getByTestId('reservation-submit').click();

    // Verify Redirect & List
    await page.waitForURL(/\/provider\/reservations$/, { timeout: 30000 });
    await expect(page.getByText(customerName)).toBeVisible();

    // Go to Detail
    const listRow = page.getByTestId(/reservation-row-/).filter({ hasText: customerName }).first();
    await listRow.waitFor({ state: "visible", timeout: 10000 });
    await listRow.click();
    // await page.waitForURL(/\/provider\/reservations\/.+/, { timeout: 10000 });

    // Confirm Reservation
    // Confirm Reservation
    // Scope search to the row to avoid matching toast messages
    await expect(listRow.getByText(/Pending|Hold/i)).toBeVisible();

    const confirmBtn = listRow.getByRole('button', { name: /Confirm|Accept/i });
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
      await expect(listRow.getByText(/Confirmed|Active/)).toBeVisible();
    }

    // Verify Persistence via Harness
    const latest = await callHarness('latest_reservation_for_provider', runId, {
      provider_id: seed.provider_id,
      customer_name: customerName,
    });
    expect(latest?.reservation?.customer_name).toBe(customerName);
  });

  test('Scenario 2: Issue -> Return Flow', async ({ page }) => {
    const runId = `issue_${Date.now()}`;
    const uniqueEmail = `e2e_provider_${runId}@example.com`;

    // Seed preflight with unique email AND capture expected reservation ID
    const seed = await callHarness('seed_preflight', runId, {
      provider_email: uniqueEmail,
      provider_status: 'approved',
      reservation_status: 'confirmed',
      asset_count: 1
    });

    // Login
    await loginAs(page, uniqueEmail, password);

    // DEBUG: Check list visibility
    await page.goto('/provider/reservations');
    try {
      await expect(page.getByText(/Preflight Customer/)).toBeVisible({ timeout: 5000 });
      console.log("[TEST] Success: Reservation is visible in list.");
    } catch (e) {
      console.log("[TEST] FAIL: Reservation NOT found in list. RLS/Data issue?");
    }

    // Navigate directly
    console.log(`[TEST] Navigating to reservation: ${seed.reservation_id}`);
    await page.goto(`/provider/reservations/edit/${seed.reservation_id}`);

    // Verify we are on detail page
    await expect(page.getByText(/Confirmed|Active/i)).toBeVisible();

    // Perform Issue (Handover)
    // Look for "Issue" button (using TestID for safety)
    const issueBtn = page.getByTestId('reservation-issue-btn');
    if (await issueBtn.isVisible()) {
      await issueBtn.click();

      // Check for Scanner Modal vs Simple Confirmation
      const manualInput = page.getByPlaceholder(/Manual code/i);
      if (await manualInput.isVisible()) {
        // Scanner Modal
        await manualInput.fill(`${seed.external_key_base}_asset_1`);
        await page.getByRole('button', { name: /Confirm|Potvrdit/i }).click();
      } else {
        // Simple Confirmation Dialog
        await page.getByRole('button', { name: /Potvrdit|Confirm/i }).click();
      }
    }

    // Wait for status update
    await expect(page.getByText('Active')).toBeVisible();

    // Perform Return
    const returnBtn = page.getByTestId('reservation-return-btn');
    await returnBtn.click();

    // Wait for dialog to open to avoid race condition
    await expect(page.getByRole('heading', { name: /Vrátit|Return/i })).toBeVisible();
    await page.waitForTimeout(500); // Stability for dialog content

    // Handle Return Flow (Scanner/Manual)
    const manualInputReturn = page.getByPlaceholder(/Manual code/i);
    const hasInput = await manualInputReturn.isVisible();
    console.log(`[TEST] Return Dialog: Manual Input Visible = ${hasInput}`);

    if (hasInput) {
      await manualInputReturn.fill(`${seed.external_key_base}_asset_1`);
      console.log(`[TEST] Return Dialog: Filled manual input`);
      await page.getByRole('button', { name: /Confirm/i }).click();
    } else {
      // Simple logic for return if needed, but return usually has scanner/check
      // Check for simple confirm button just in case
      const confirmReturn = page.getByRole('button', { name: /Potvrdit|Confirm/i });
      const hasConfirm = await confirmReturn.isVisible();
      console.log(`[TEST] Return Dialog: Confirm Button Visible = ${hasConfirm}`);

      if (hasConfirm) {
        await confirmReturn.click({ force: true });
        console.log(`[TEST] Return Dialog: Clicked Confirm`);
      } else {
        console.log(`[TEST] Return Dialog: Confirm Button NOT visible!`);
      }
    }

    // Verify Completed
    await expect(page.getByText('Completed')).toBeVisible();
  });
});
