import { Page, expect } from '@playwright/test';

export const loginAs = async (page: Page, email: string, password: string) => {
  await page.goto('/login');
  const fillFirst = async (locators: ReturnType<Page['locator']>[], value: string) => {
    for (const loc of locators) {
      try {
        await loc.first().fill(value, { timeout: 4000 });
        return;
      } catch {
        // try next
      }
    }
    throw new Error('No matching locator found to fill value');
  };

  await fillFirst(
    [
      page.getByTestId('login-email'),
      page.getByPlaceholder(/hello@example\.com/i),
      page.getByLabel(/email/i),
    ],
    email
  );

  await fillFirst(
    [
      page.getByTestId('login-password'),
      page.getByPlaceholder(/•/i),
      page.getByLabel(/password/i),
    ],
    password
  );

  const submitLocators = [
    page.getByTestId('login-submit'),
    page.getByRole('button', { name: /sign in/i }),
  ];
  let clicked = false;
  for (const loc of submitLocators) {
    try {
      await loc.first().click({ timeout: 4000 });
      clicked = true;
      break;
    } catch {
      // try next
    }
  }
  if (!clicked) throw new Error('Login submit button not found');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/(provider\/dashboard|provider\/pending|provider|admin|)$/);
};
