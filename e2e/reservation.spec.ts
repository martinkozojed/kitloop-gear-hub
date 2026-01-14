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

test.describe('Reservation smoke', () => {
  test('provider can create reservation via UI', async ({ page }) => {
    const { email, password } = getProviderCreds();
    const runId = `res_${Date.now()}`;
    const seed = await callHarness('seed', runId, { provider_email: email, provider_status: 'approved' });
    const productName = seed.product_name || seed.prefix;
    const variantName = seed.variant_name || seed.prefix;

    const customerName = `E2E Customer ${Date.now()}`;
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

    try {
      await loginAs(page, email, password);
      await page.goto('/provider/reservations/new');

      await page.locator('#customer_name').fill(customerName);
      await page.locator('#customer_phone').fill('+420 777 777 777');
      await page.locator('#customer_email').fill(`qa+${Date.now()}@example.com`);

      await page.getByTestId('reservation-product-select').click();
      await page.getByRole('option', { name: productName, exact: false }).click();

      await page.getByTestId('reservation-variant-select').click();
      await page.getByRole('option', { name: new RegExp(variantName, 'i') }).first().click();

      await page.getByTestId('reservation-start').fill(formatDateTimeLocal(start));
      await page.getByTestId('reservation-end').fill(formatDateTimeLocal(end));

      await page.getByTestId('reservation-submit').click();
      await page.waitForURL(/\/provider\/reservations/, { timeout: 20000 });

      await expect(page.getByText(customerName)).toBeVisible({ timeout: 10000 });
    } finally {
      await callHarness('cleanup', runId);
    }
  });
});
