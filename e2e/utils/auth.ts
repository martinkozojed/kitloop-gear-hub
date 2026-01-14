import { Page, expect } from '@playwright/test';

export const loginAs = async (page: Page, email: string, password: string) => {
  await page.goto('/login');
  await page.locator('input#email').fill(email);
  await page.locator('input#password').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/(provider\/dashboard|provider\/pending|provider|admin|)$/);
};
