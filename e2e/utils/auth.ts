import { Page, expect } from '@playwright/test';

export const loginAs = async (page: Page, email: string, password: string) => {
  await page.goto('/login');
  const pickLocator = async (locators: ReturnType<Page['locator']>[]) => {
    for (const loc of locators) {
      const candidate = loc.first();
      try {
        await expect(candidate).toBeVisible({ timeout: 5000 });
        await expect(candidate).toBeEnabled({ timeout: 5000 });
        return candidate;
      } catch {
        // try next
      }
    }
    throw new Error('No matching locator found');
  };

  const emailLocator = await pickLocator([
    page.getByTestId('login-email'),
    page.getByPlaceholder(/hello@example\.com/i),
    page.getByLabel(/email/i),
  ]);
  await emailLocator.fill(email, { timeout: 5000 });

  const passwordLocator = await pickLocator([
    page.getByTestId('login-password'),
    page.getByPlaceholder(/•/i),
    page.getByLabel(/password/i),
  ]);
  await passwordLocator.fill(password, { timeout: 5000 });

  const submitLocator = await pickLocator([
    page.getByTestId('login-submit'),
    page.getByRole('button', { name: /sign in/i }),
  ]);
  await submitLocator.click({ timeout: 5000 });

  await page.waitForLoadState('networkidle');
  await page.waitForURL(/\/(provider\/dashboard|provider\/pending|provider\/|admin\/|browse\/|)$/i, { timeout: 15000 });
  await expect(emailLocator).not.toBeVisible({ timeout: 3000 });
};
