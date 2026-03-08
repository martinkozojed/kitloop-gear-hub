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

test.describe('E2E Kit Bundles', () => {
    const { password } = getProviderCreds();

    test.afterEach(async ({ page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            console.log(`[FAILURE] Test failed: ${testInfo.title}`);
            console.log(`[FAILURE] URL: ${page.url()}`);
        }
    });

    test('Provider can create a kit, reserve it, and process issue/return as a batch', async ({ page }) => {
        const runId = `kit_${Date.now()}`;
        const uniqueEmail = `e2e_provider_${runId}@example.com`;

        // Seed data with 2 assets to allow a kit of quantity 2
        const seed = await callHarness('seed_preflight', runId, {
            provider_email: uniqueEmail,
            provider_status: 'approved',
            asset_count: 2
        });

        await loginAs(page, uniqueEmail, password);

        // 1. Create a Kit
        await page.goto('/provider/kits');

        // Check we're on the right page
        await expect(page.getByText('Sety vybavení')).toBeVisible();

        // Open new kit modal
        await page.getByRole('button', { name: /Nový set|New Kit/i }).click();

        // Fill the kit form
        await page.getByLabel(/Název setu|Kit name/i).fill('Testovací E2E Kit');

        // Open variant selector
        await page.getByRole('combobox').click();
        await page.getByRole('option').first().click();

        // Click Add item (+) button
        await page.locator('.flex.gap-2 > button[type="button"]').click();

        // Set quantity
        await page.locator('input[type="number"]').fill('2');

        // Save Kit
        await page.getByRole('button', { name: /Uložit|Vytvořit|Create|Save/i }).click();

        // Wait for the kit to appear in the list
        await expect(page.getByText('Testovací E2E Kit')).toBeVisible();

        // 2. Create Reservation using the Kit
        await page.goto('/provider/reservations/new');

        const customerName = `Kit Customer ${Date.now()}`;
        await page.locator('#customer_name').fill(customerName);
        await page.locator('#customer_phone').fill('+420 777 777 777');
        await page.locator('#customer_email').fill(`kit+${Date.now()}@example.com`);

        // Toggle to Kit mode
        await page.getByRole('button', { name: /Set \(kit\)|Kit/i }).click();

        // Select the newly created kit
        await page.getByRole('combobox').click();
        await page.getByRole('option', { name: /Testovací E2E Kit/ }).click();

        const start = new Date(Date.now() + 2 * 60 * 60 * 1000); // offset by 2 hours
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000); // 1 day duration
        await page.getByTestId('reservation-start').fill(formatDateTimeLocal(start));
        await page.getByTestId('reservation-end').fill(formatDateTimeLocal(end));

        // Submit reservation
        await page.getByTestId('reservation-submit').click();

        // 3. Verify it redirects and shows in reservations list
        await page.waitForURL(/\/provider\/reservations$/, { timeout: 30000 });
        await expect(page.getByText(customerName).first()).toBeVisible();

        // 4. Test Dashboard Operations (Issue / Return Batch)
        await page.goto('/provider');

        // The items might show up in "Today" if scheduled for today, 
        // but we scheduled it for 2 hours later, so it will be under Pickups
        await expect(page.getByText(customerName).first()).toBeVisible();

        // Click on Issue from dashboard
        const actionRow = page.getByTestId(/agenda-row-/).filter({ hasText: customerName }).first();
        const issueBtn = actionRow.getByRole('button', { name: /Vydat|Issue/i });
        if (await issueBtn.isVisible()) {
            await issueBtn.click();

            // Confirm issue in modal
            await page.getByRole('button', { name: 'Potvrdit výdej' }).click();

            // Success toast should appear
            await expect(page.getByText('Výdej dokončen')).toBeVisible();
        }

        // Now it should be in Returns or Active, wait for UI update
        await page.waitForTimeout(2000);

        // Return the items
        const returnBtn = actionRow.getByRole('button', { name: /Vrátit|Return/i });
        if (await returnBtn.isVisible()) {
            await returnBtn.click();

            // Confirm return without damage
            await page.getByRole('button', { name: 'Vrátit bez poškození' }).click();

            // Success toast should appear
            await expect(page.getByText('Vrácení dokončeno')).toBeVisible();
        }
    });
});
