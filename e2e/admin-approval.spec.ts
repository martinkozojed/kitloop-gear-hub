import { test, expect } from '@playwright/test';
import { loginAs } from './utils/auth';
import { getAdminCreds, getPendingProviderCreds } from './utils/env';
import { callHarness } from './utils/harness';

test.describe('Admin approvals', () => {
  test('approve and reject pending provider', async ({ page }) => {
    const pending = getPendingProviderCreds();
    const rowText = pending.email!;
    const runId = `approval_${Date.now()}`;
    const password = pending.password || 'password123';

    // Ensure admin user exists and is promoted
    await callHarness('seed_admin', runId, { password: 'password123' });

    const seed = await callHarness('seed', runId, {
      provider_email: pending.email!,
      provider_status: 'pending',
    });

    // Ensure password is set to known value for login
    await callHarness('reset_password', runId, {
      email: pending.email!,
      password: pending.password || 'password123'
    });

    const { email: adminEmail, password: adminPassword } = getAdminCreds();
    await loginAs(page, adminEmail, adminPassword);
    await page.goto('/admin/providers');

    const row = page.getByTestId(`pending-provider-row-${seed.provider_id}`);
    await expect(row).toBeVisible({ timeout: 15000 });

    await page.getByTestId(`approve-provider-${seed.provider_id}`).click();

    try {
      await expect(row).not.toBeVisible({ timeout: 15000 });

      // Provider can now access dashboard
      const providerContext = await page.context().browser()?.newContext();
      if (!providerContext) throw new Error('Failed to create provider context');
      const providerPage = await providerContext.newPage();
      await loginAs(providerPage, pending.email!, password);
      await providerPage.goto('/provider/dashboard');
      await expect(providerPage).toHaveURL(/provider\/dashboard/);
      await providerContext.close();

      await callHarness('seed', runId, {
        provider_email: pending.email!,
        provider_status: 'pending',
      });
      await page.reload();
      const pendingRow = page.getByTestId(`pending-provider-row-${seed.provider_id}`);
      await expect(pendingRow).toBeVisible({ timeout: 15000 });

      await page.getByTestId(`reject-provider-${seed.provider_id}`).click();

      await expect(pendingRow).not.toBeVisible({ timeout: 15000 });

      // After rejection, provider stays blocked
      const rejectContext = await page.context().browser()?.newContext();
      if (!rejectContext) throw new Error('Failed to create provider context');
      const rejectPage = await rejectContext.newPage();
      await loginAs(rejectPage, pending.email!, pending.password || '');
      await rejectPage.goto('/provider/dashboard');
      await expect(rejectPage.getByText(/Waiting for approval/i)).toBeVisible({ timeout: 10000 });
      await rejectContext.close();

      const pendingRowAfterReject = page.getByTestId(`pending-provider-row-${seed.provider_id}`);
      await expect(pendingRowAfterReject).not.toBeVisible({ timeout: 15000 });
    } finally {
      await callHarness('cleanup', runId);
    }
  });
});
