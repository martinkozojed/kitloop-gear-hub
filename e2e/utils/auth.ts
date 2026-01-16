import { Page, expect } from '@playwright/test';

export const loginAs = async (page: Page, email: string, password: string) => {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/(provider\/dashboard|provider\/pending|provider|admin|)$/);
};
