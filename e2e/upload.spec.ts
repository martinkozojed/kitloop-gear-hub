import { test, expect } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import { loginAs } from './utils/auth';
import { getProviderCreds } from './utils/env';
import { callHarness } from './utils/harness';

const tinyPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PtbA2wAAAABJRU5ErkJggg==';

test('image upload accepts real image and rejects spoofed file', async ({ page }, testInfo) => {
  const { email, password } = getProviderCreds();
  const runId = `upload_${Date.now()}`;
  await callHarness('seed', runId, { provider_email: email, provider_status: 'approved' });

  const validImagePath = path.join(testInfo.outputDir, 'valid.png');
  const spoofPath = path.join(testInfo.outputDir, 'spoof.jpg');

  await fs.writeFile(validImagePath, Buffer.from(tinyPngBase64, 'base64'));
  await fs.writeFile(spoofPath, 'this is not really an image');

  try {
    await loginAs(page, email, password);
    await page.goto('/provider/inventory/new');

    const fileInput = page.getByTestId('inventory-image-input');

    await fileInput.setInputFiles(validImagePath);
    await expect(page.getByTestId('inventory-image-preview')).toHaveCount(1);

    await fileInput.setInputFiles(spoofPath);

    await expect(page.getByTestId('inventory-image-preview')).toHaveCount(1);
    await expect(page.getByText(/Neplatné soubory|Invalid/)).toBeVisible();
  } finally {
    await callHarness('cleanup', runId);
  }
});
