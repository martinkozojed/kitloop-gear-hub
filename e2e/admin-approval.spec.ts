import { test, expect } from '@playwright/test';
import { loginAs } from './utils/auth';
import { getAdminCreds, getPendingProviderCreds } from './utils/env';
import { callHarness } from './utils/harness';

test.describe('Admin approvals', () => {
  test('approve and reject pending provider', async ({ page }) => {
    const pending = getPendingProviderCreds();
    test.skip(!pending.email, 'E2E_PENDING_PROVIDER_EMAIL not set');

    const rowText = pending.email!;
    const runId = `approval_${Date.now()}`;
    const seed = await callHarness('seed', runId, {
      provider_email: pending.email!,
      provider_status: 'pending',
    });

    const { email: adminEmail, password: adminPassword } = getAdminCreds();
    await loginAs(page, adminEmail, adminPassword);
    await page.goto('/admin/providers');

    const row = page.getByRole('row').filter({ hasText: rowText });
    await expect(row).toBeVisible({ timeout: 15000 });

    await row.getByRole('button', { name: /Approve/i }).click();

    try {
      await expect(
        page.getByRole('row').filter({ hasText: rowText })
      ).toBeVisible({ timeout: 15000 });

      await row.getByRole('button', { name: /Approve/i }).click();

      await expect(
        page.getByRole('row').filter({ hasText: rowText })
      ).not.toBeVisible({ timeout: 15000 });

      // Provider can now access dashboard
      const providerContext = await page.context().browser()?.newContext();
      if (!providerContext) throw new Error('Failed to create provider context');
      const providerPage = await providerContext.newPage();
      await loginAs(providerPage, pending.email!, pending.password || '');
      await providerPage.goto('/provider/dashboard');
      await expect(providerPage).toHaveURL(/provider\/dashboard/);
      await providerContext.close();

      await callHarness('seed', runId, {
        provider_email: pending.email!,
        provider_status: 'pending',
      });
      await page.reload();
      const pendingRow = page.getByRole('row').filter({ hasText: rowText });
      await expect(pendingRow).toBeVisible({ timeout: 15000 });

      await pendingRow.getByRole('button', { name: /Reject/i }).click();

      await expect(
        page.getByRole('row').filter({ hasText: rowText })
      ).not.toBeVisible({ timeout: 15000 });

      // After rejection, provider stays blocked
      const rejectContext = await page.context().browser()?.newContext();
      if (!rejectContext) throw new Error('Failed to create provider context');
      const rejectPage = await rejectContext.newPage();
      await loginAs(rejectPage, pending.email!, pending.password || '');
      await rejectPage.goto('/provider/dashboard');
      await expect(rejectPage.getByText(/Waiting for approval/i)).toBeVisible({ timeout: 10000 });
      await rejectContext.close();

      const audit = await callHarness('latest_audit_for_provider', runId, {
        provider_id: seed.provider_id,
      });
      expect(audit?.audit).toBeTruthy();
    } finally {
      await callHarness('cleanup', runId);
    }
  });
});
